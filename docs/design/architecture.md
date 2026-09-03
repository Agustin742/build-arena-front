# Capas y responsabilidades

Cómo se reparte el trabajo dentro del código y, sobre todo, **qué no se comparte**. Las decisiones y
sus justificaciones están en [`overview.md`](./overview.md); el orden de construcción, en
[`implementation-plan.md`](./implementation-plan.md).

---

## El mapa

```
  ui/                      pantallas y componentes; no conoce transporte
   |
  application/             casos de uso, hooks de Query, comandos
   |
  infrastructure/          HTTP y socket; el unico lugar que habla con la red
   |
  API Build Arena

  contracts/               esquemas Zod del cable; los usa infrastructure
  domain/                  tipos y tablas del feature; no depende de nada
  commands/                registro de comandos; lo alimenta application
```

Hay dos módulos que quedan a un costado a propósito, igual que el motor de combate en la API:

**`contracts/`** no es una capa intermedia: es un conjunto de esquemas puros que `infrastructure`
usa para validar lo que entra. No importa React, ni Query, ni el socket.

**`commands/`** es un registro y un resolvedor, ambos puros. No sabe qué comandos existen: se los
registran desde afuera. Se testea entero sin montar un componente.

---

## Qué hace cada capa

### `ui/`

Pinta y captura intención. Lee de un hook, invoca un comando, muestra el resultado.

Un componente **no llama a `fetch`, no llama a `socket.emit`, no interpreta un `code` de error y no
calcula nada del juego**. Si un componente tiene un `if` sobre reglas de combate, esa línea está en
el lugar equivocado — y como el front no tiene reglas de combate, esa línea directamente no debería
existir.

La razón de separarlo es la misma que en la API, y aparece con la arena: **la misma acción se invoca
desde un clic en la lista y desde el prompt de texto.** Si la lógica vive en el `onClick`, hay que
escribirla dos veces, y la segunda va a quedar desincronizada.

### `application/`

Acá vive el caso de uso: qué se pide, en qué orden, qué se invalida después y qué comando lo expone.

- Los hooks de TanStack Query, con sus claves y sus invalidaciones
- Las mutaciones y qué queries tocan al terminar
- La definición de cada comando y sus argumentos
- La traducción de errores de la API a mensajes de juego, por `code`

No pinta y no abre conexiones. Orquesta.

### `infrastructure/`

El único lugar del proyecto que habla con la red. Dos piezas:

- **`http/`** — el cliente, el interceptor de `401` y el refresh single-flight
- **`realtime/`** — el adapter de Socket.IO, que traduce eventos a acciones del store

Todo lo que entra de la red pasa por un esquema de `contracts/` antes de seguir viaje. Adentro de la
aplicación ya no hay `any`, ni `as`, ni campos que "seguro vienen".

### `domain/`

Tipos propios del feature y las pocas tablas que el front tiene permitido conocer: costo de
atributos, modificadores, y las fórmulas de valores derivados marcadas como estimación.

Sin React, sin red, determinista. Es la parte que se testea entera en milisegundos, y por eso se
escribe primero.

---

## Estructura de carpetas

```
src/
  app/
    providers/
    routes/
    layout/
  features/
    auth/
    builds/
    skills/
    friendships/
    battles/
    leaderboard/
  shared/
    contracts/
    http/
    realtime/
    commands/
    ui/
    lib/
```

Cada feature repite la misma estructura interna, y expone lo que otros pueden usar por un único
`index.ts`:

```
features/builds/
  domain/            attribute-cost.ts, derived-stats.ts, types.ts
  application/       use-builds.ts, use-create-build.ts, commands.ts
  infrastructure/    builds.api.ts
  ui/                BuildList.tsx, BuildWizard.tsx, ...
  index.ts
```

### Reglas de dependencia

Cuatro, y ninguna se negocia.

1. **La flecha apunta hacia adentro.** `ui` puede importar de `application`, `application` de
   `domain` e `infrastructure`. Nunca al revés: `domain` no importa nada del proyecto.
2. **Un feature no importa el interior de otro.** Solo su `index.ts`. Si hace falta algo que no está
   exportado, o se exporta a propósito o no correspondía.
3. **La red solo se toca en `infrastructure`.** Un `fetch` o un `socket.emit` fuera de ahí es un
   defecto.
4. **`shared/ui` no conoce features.** Las primitivas reciben datos por props y no saben qué es una
   build.

---

## Las cuatro piezas que sostienen el proyecto

### 1. `contracts/` — el borde tipado

Un esquema Zod por cada objeto que viaja: `Skill`, `Build`, `CombatantView`, `TurnView`, cada
variante de `events`, cada `code` de `battle:error`, cada `rule` de `violations`. Los tipos de
TypeScript se **infieren** del esquema, nunca se escriben dos veces.

```ts
export const CombatantViewSchema = z.object({
  userId: z.string().uuid(),
  combatantId: z.string().uuid(),
  strength: z.number().int(),
  magic: z.number().int(),
  dexterity: z.number().int(),
  constitution: z.number().int(),
  armorClass: z.number().int(),
  maxHp: z.number().int(),
  currentHp: z.number().int(),
  initiative: z.number().int(),
  reactionAvailable: z.boolean(),
  conditions: z.array(ConditionSchema),
  skillCodes: z.array(SkillCodeSchema),
})

export type CombatantView = z.infer<typeof CombatantViewSchema>
```

`events` se modela como **unión discriminada por `type`**. Eso es lo que hace que el renderizador de
la narración sea exhaustivo: si el backend agrega un evento y se actualiza el esquema, TypeScript
señala el `switch` incompleto en tiempo de compilación en vez de dejar una línea en blanco en
producción.

### 2. `http/` — el cliente y el refresh single-flight

El interceptor de `401` es la pieza que más se hace mal, y el error es siempre el mismo: **tres
peticiones fallan a la vez y se disparan tres refresh.** Como `/auth/refresh` **rota** el token, el
primero invalida a los otros dos y la sesión se cae sola.

La solución es una sola promesa compartida:

```ts
let refreshInFlight: Promise<TokenPair> | null = null

async function refreshOnce(): Promise<TokenPair> {
  refreshInFlight ??= doRefresh().finally(() => {
    refreshInFlight = null
  })
  return refreshInFlight
}
```

El procedimiento completo ante un `401`:

1. Esperar `refreshOnce()`. El primero renueva; los demás esperan al primero.
2. Guardar **el par nuevo**, porque el refresh viejo ya no sirve.
3. Reintentar la petición original **una sola vez**.
4. Si el refresh también devuelve `401`, la sesión terminó: limpiar y navegar a `/login`.
5. Si había un socket abierto, **reconectarlo** con el token nuevo.

El paso 5 no es un detalle: el token del handshake ya se validó y no se revalida, pero una
reconexión con uno vencido rebota. Renovar sin reconectar deja una batalla que funciona hasta que se
cae la conexión, y ahí ya no vuelve.

### 3. `commands/` — la pieza central

El registro que hace posible que clic y teclado sean la misma cosa.

```ts
export interface CommandArg {
  name: string
  kind: 'text' | 'password' | 'number' | 'pick'
  label: string
  required: boolean
  options?: (ctx: CommandContext) => CommandOption[]
}

export interface Command {
  id: string
  label: string
  aliases: string[]
  args: CommandArg[]
  scope: CommandScope
  isEnabled: (ctx: CommandContext) => boolean
  run: (args: ParsedArgs, ctx: CommandContext) => Promise<CommandResult>
}
```

| Campo | Para qué lado | Ejemplo |
| --- | --- | --- |
| `label` | Lo que se ve en la lista clickeable | `Nueva build` |
| `aliases` | Lo que acepta el prompt de texto | `build new`, `bn` |
| `args` | Genera **los dos**: el formulario guiado y la firma tipeada | `<name>` |
| `scope` | Qué comandos existen en cada estado | `anonymous`, `lobby`, `battle`, `reaction-window` |
| `isEnabled` | Se muestra deshabilitado, no se esconde | sin builds no se puede desafiar |

Del registro salen dos consumidores y ninguno duplica lógica:

- **`CommandList`** renderiza `registry.visible(scope, ctx)` numerado y clickeable.
- **`resolve(input, scope, ctx)`** parsea texto y devuelve el mismo `Command` con sus argumentos, o
  un error con los candidatos parecidos.

Un `pick` no obliga a tipear un uuid: por clic abre un selector con `options()`, y por texto acepta
el número de la última lista mostrada. **El mapa `número → id` de esa lista vive en el contexto del
registro**, no en el componente que la pintó.

`isEnabled` devolviendo `false` **muestra la opción atenuada con su motivo, no la esconde.** Esconder
opciones deja al jugador sin saber que existen; es la misma decisión que tomar con las habilidades
bloqueadas del asistente de build.

### 4. `realtime/` — el adapter de socket y el store de batalla

Un solo objeto abre la conexión, se suscribe a los siete eventos del servidor y los traduce a
acciones del store.

```ts
export interface BattleSocket {
  connect(token: string): void
  join(battleId: string): void
  declareAction(battleId: string, skillCode: SkillCode): void
  declareReaction(battleId: string, skillCode: SkillCode | null): void
  disconnect(): void
}
```

**Ningún componente llama a `socket.on`.** La arena monta el adapter una vez y lee del store. Si cada
componente se suscribiera por su cuenta, dos montajes darían dos suscripciones, y el log mostraría
cada evento dos veces — un defecto que aparece recién cuando alguien agrega un componente meses
después.

El store guarda el estado de la pelea y el registro acumulado:

```ts
interface BattleState {
  battleId: string | null
  status: BattleStatus
  currentRound: number
  activeUserId: string | null
  combatants: CombatantView[]
  turns: TurnView[]
  log: LogEntry[]
  openWindow: ReactionWindow | null
  opponentLeft: OpponentLeft | null
  lastError: BattleErrorView | null
  connection: 'idle' | 'connecting' | 'open' | 'closed' | 'rejected'
}
```

Dos reglas del store que salen directo del contrato:

- **`battle:state` reemplaza; `battle:turn_resolved` acumula.** El primero es la foto completa al
  entrar o reconectar; el segundo es un incremento que llega a los dos jugadores igual. Después de un
  turno **no se vuelve a pedir estado**: ya llegó.
- **Si `events` viene vacío**, el registro se reconstruye desde `turns` y `combatants`. Pasa en un
  re-emit idempotente, y las tiradas no se persisten: no hay forma de recuperarlas. `turns` y
  `combatants` sí son el contrato.

El renderizador de la narración es una función pura del evento a una línea, con `switch` exhaustivo
y `assertNever` en el `default`. Se testea sin React.

---

## Por qué no hay un `useApi` genérico

La tentación es un hook `useApi<T>(url)` que sirva para builds, amistades, batallas y leaderboard.
Para esta API no funciona, y no es cuestión de gusto: el contrato lo rompe en el primer recurso.

| Recurso | Qué necesita que un genérico no tiene |
| --- | --- |
| `builds` | Un `400` con envoltorio propio (`violations`), distinto del del `ValidationPipe` |
| `friendships` | `DELETE` significa tres cosas distintas según `status` y `direction` |
| `battles` | Cada transición tiene su ruta y su cuerpo; `accept` además arranca el socket |
| `skills` | Solo lectura, se pide una vez y no se invalida nunca |
| `leaderboard` | Sin identidad ni cache por id: es una lista con un parámetro |

De cinco recursos, el genérico sirve para uno. En los otros cuatro hay que pasarle parámetros,
sobrescribir el manejo de error o ignorarlo.

Y hay un problema peor que la incomodidad. **Lo que se repite entre features no es el pedido: es el
manejo de sesión y de error.** Eso ya está resuelto en el cliente HTTP, una vez, y desde ahí lo hereda
todo el mundo sin saberlo. Esconder además el pedido detrás de un genérico no unifica nada: vuelve
invisible justo lo que hay que leer con atención, que es qué se invalida después de cada mutación.

---

## Qué sí se comparte, y cómo

Todo lo transversal se resuelve por **composición**: piezas que se aplican desde afuera o se inyectan.

| Necesidad | Mecanismo | No así |
| --- | --- | --- |
| Sesión y token | Store de sesión leído por el cliente HTTP y por el adapter | Prop pasada por diez niveles |
| Renovar y reintentar | Interceptor del cliente HTTP | `try/catch` en cada hook |
| Validar lo que entra | Esquema de `contracts/` en el borde | Comprobar campos en el componente |
| Proteger rutas | Un componente de ruta que exige sesión | `if` de redirección en cada pantalla |
| Traducir errores | Tabla por `code` en `application` | Comparar textos en la vista |
| Estética | Variables CSS y primitivas de `shared/ui` | Clases repetidas en cada pantalla |

La diferencia no es estética. Una capa genérica ata a todos sus consumidores a su forma, y esa
atadura no se deshace sin tocarlos a todos. La composición se agrega y se quita de a una pieza.

---

## Testing

Testing-library sobre el comportamiento observable, MSW en la red, y nada de espiar implementación.
El proyecto trabaja en TDD estricto: el test se escribe antes.

| Qué | Cómo | Qué prueba |
| --- | --- | --- |
| `domain/` | Vitest puro | La tabla de costos, los modificadores, los valores derivados |
| `contracts/` | Vitest puro | Que un payload real del guide valida, y que uno deforme falla |
| `http/` | Vitest + MSW | Que tres `401` simultáneos disparan **un** refresh, que el reintento ocurre una vez, que un refresh fallido limpia la sesión |
| `commands/` | Vitest puro | Que un alias resuelve al mismo comando que el clic, que un alias desconocido devuelve candidatos, que el `scope` filtra |
| `realtime/` | Vitest con un doble del socket | Que cada evento deja el store como corresponde; que `events` vacío cae a `turns` |
| `ui/` | Testing Library + MSW | Los flujos: login, asistente de build con `violations`, un turno completo, la ventana con su contador |

El doble del socket implementa `BattleSocket` y emite eventos a mano. La arena no distingue el doble
del real, que es la prueba de que el adapter está bien puesto.

---

## Cuándo abstraer

No antes de tener **tres casos reales** delante.

Con dos casos parecidos siempre parecen el mismo, y la abstracción sale prematura. Con tres se ve
cuál era la diferencia que importaba, y recién ahí se sabe qué había que compartir de verdad.

Duplicar dos veces es barato. Desarmar una abstracción equivocada, con cinco features colgando de
ella, no lo es.
