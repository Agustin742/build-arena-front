# Plan de implementación — Build Arena Web

Orden de construcción del cliente. El diseño y sus justificaciones están en
[`overview.md`](./overview.md); las capas, en [`architecture.md`](./architecture.md); el contrato de
la API, en [`docs/frontend-guide.md`](../frontend-guide.md).

---

## Reglas que ordenan el plan

Seis reglas que no se negocian, porque cada una previene una forma conocida de no llegar.

1. **El deploy va primero, vacío.** Una página desplegada apuntando a la API real el día uno. El
   deploy no falla por el código: falla por la variable de entorno, por el CORS, por la ruta base o
   por el modo SPA sin *fallback*. Descubrirlo la última semana es cómo se pierde la cursada.
2. **Los contratos antes que las pantallas.** Los esquemas de `contracts/` se escriben contra el
   guide antes de que exista una vista. Toda pantalla que se construya después va tipada de punta a
   punta.
3. **El registro de comandos antes que la primera lista.** Es la pieza de la que cuelgan las dos
   entradas. Si la primera pantalla se cablea a mano "por ahora", ese "por ahora" queda.
4. **Nada de reglas de combate en el front.** La única tabla permitida es la de costos de atributos,
   y va marcada como ayuda visual. Si aparece un cálculo de daño, se borra.
5. **Cada fase termina con el deploy verde.** No se acumulan fases sin subir. Si algo rompe
   producción, se sabe cuál fue.
6. **La estética se define una vez, en la fase 3, y no se retoca por pantalla.** El tema vive en
   variables CSS. Ajustar colores en la fase 9 es el pozo sin fondo de este proyecto.

> **TDD estricto está activo.** Cada entregable de cada fase se escribe con su test antes. Los
> commits de test pueden ir con el `feat` correspondiente cuando cubren la misma unidad de trabajo.

---

## Qué fases usan SDD

Cada fase se construye por una de dos rutas: **directa** o **SDD**. La ruta se elige por un solo
criterio.

> **SDD se usa cuando escribir propuesta, especificación, diseño y tareas reduce ambigüedad real.
> Nunca por tamaño, ni por cantidad de archivos, ni por miedo.**

Esto hay que decirlo fuerte porque la intuición dice lo contrario. La fase 6 es la más grande del
plan —asistente de build, presupuesto en vivo, validaciones, CRUD completo— y va por ruta directa.
No porque sea fácil, sino porque **no hay nada que decidir**: el guide ya fijó la tabla de costos,
los requisitos de cada habilidad, el envoltorio de `violations` y qué se muestra bloqueado. Es
trabajo largo, no trabajo dudoso. Especificarlo sería transcribir el guide en otro archivo.

Una fase pide SDD cuando, al sentarse a escribirla, todavía hay preguntas cuya respuesta cambia el
código y que no están contestadas en ningún documento.

### La tabla

| Fase | Ruta | Por qué |
| --- | --- | --- |
| 0 — Fundación | Directa | Andamiaje conocido. Las decisiones ya están tomadas en [`overview.md`](./overview.md#4-stack) |
| 1 — Contratos | Directa | Transcripción tipada del guide. Mecánica y verificable de un vistazo |
| 2 — Sesión y HTTP | Directa | El único punto difícil —el refresh single-flight— ya está resuelto y escrito en [`architecture.md`](./architecture.md#2-http--el-cliente-y-el-refresh-single-flight) |
| 3 — Sistema de diseño | Directa | Seis primitivas y un tema. Ambigüedad estética, no estructural: se resuelve mirando, no especificando |
| **4 — Registro de comandos** | **SDD** | `add-command-registry` |
| 5 — Autenticación | Directa | Cuatro endpoints y una ruta protegida. El único detalle fino —`register` no devuelve tokens— ya está anotado en la fase |
| 6 — Catálogo y asistente de build | Directa | La fase más grande del plan, y la menos ambigua. Ver el párrafo de arriba |
| 7 — Social y desafíos | Directa | Listas y transiciones. El servidor ya orienta `direction`, `role`, `rival` y `outcome`: no queda nada que decidir |
| **8 — Conexión de combate** | **SDD** | `add-battle-realtime` |
| **9 — Arena** | **SDD** | `add-battle-arena` |
| 10 — Cierre y rating | Directa | Un evento, una pantalla y unas invalidaciones |
| 11 — Pulido | Directa | Trabajo incremental sobre pantallas que ya existen |

Tres de doce. Si la lista creciera, la señal no sería que el proyecto es complejo: sería que el
diseño quedó incompleto y se está usando SDD para taparlo.

### Por qué esas tres

**Fase 4 — `add-command-registry`.** Es la única pieza del proyecto que se inventa acá. Todo lo demás
tiene un contrato del otro lado que dice cómo es; el registro no. Y las preguntas abiertas son
reales:

- ¿Cómo se declara un argumento que por clic abre un selector y por teclado acepta un número?
- ¿Dónde vive el mapa `número → id` y cuándo se invalida?
- ¿Qué pasa cuando un alias resuelve a dos comandos, o a ninguno?
- ¿El `scope` es un valor plano o se compone —lobby dentro de sesión, ventana dentro de batalla—?
- ¿Un comando deshabilitado se muestra siempre, o solo cuando su motivo es accionable?

Ninguna está contestada en el guide, porque el guide no sabe que este registro existe. Y es la pieza
de la que cuelga **toda** la interacción de la aplicación: equivocarla se paga en las siete fases que
siguen. Ese es exactamente el caso para el que existe SDD.

**Fase 8 — `add-battle-realtime`.** Acá hay contrato del otro lado, pero el contrato dice qué llega,
no qué hacer con lo que llega. Las decisiones del store son propias y tienen forks reales:

- Qué reemplaza y qué acumula, evento por evento
- Cómo se comporta la reconexión con una ventana abierta y `remainingMs` corriendo
- Qué se hace con un `turn_resolved` de `events` vacío, que es un re-emit idempotente
- Cómo se coordinan el refresh de token y la reconexión del socket sin perder la sala
- Qué se preserva del registro cuando `battle:state` reemplaza el estado

Es la misma decisión que tomó la API: su fase de tiempo real fue una de las dos que se hicieron con
SDD. Los dos lados del mismo problema merecen el mismo trato.

**Fase 9 — `add-battle-arena`.** Se apoya en la especificación de la 8, pero agrega lo suyo: el
contador que corre contra un `deadline` del servidor y no contra el reloj local, qué se muestra
cuando la ventana expira sin respuesta, cómo conviven el prompt de acción y el de reacción sin
pisarse, y cómo se reconstruye el registro desde `turns` cuando no hay narración. Es la pantalla que
más estados tiene del proyecto entero, y la que más caro sale rehacer.

### Qué implica elegir SDD en una fase

- La rama toma el nombre de la change: `feat/add-command-registry`.
- Los artefactos —propuesta, especificación, diseño, tareas— se commitean **en esa misma rama y
  antes** de la implementación, con tipo `docs`. Así el pull request cuenta la secuencia completa:
  primero qué se decidió, después cómo se construyó.
- La fase se cierra recién cuando la verificación pasa y la change se archiva.
- El "terminado cuando" de la fase **no se reemplaza** por la verificación de SDD: se suman.

```
docs(commands): add sdd proposal and spec for command registry
docs(commands): add design and task breakdown
feat(commands): add command registry with scope filtering
...
```

Las fases directas no crean artefactos de SDD. No hay propuestas de trámite ni especificaciones
escritas después del código para que el historial quede prolijo: eso es ceremonia, y la ceremonia
sin decisión adentro es tiempo que no se recupera.

---

## Fase 0 — Fundación

**Objetivo:** que exista una URL pública sirviendo la aplicación antes de escribir una sola pantalla.

- Repositorio nuevo en GitHub. El flujo está en [`git-workflow.md`](./git-workflow.md).
- `pnpm create vite` con React y TypeScript en modo estricto.
- ESLint 9 con configuración plana, y Prettier.
- Tailwind configurado, con las variables del tema declaradas vacías todavía.
- Vitest, Testing Library y MSW instalados, con un test de humo que pasa.
- `.env.example` con `VITE_API_URL`, y `.env` en `.gitignore`.
- Rutas mínimas y un `AppShell` vacío.
- Desplegado en un hosting estático con *fallback* a `index.html` para las rutas del cliente.

**Terminado cuando:** la URL de producción sirve la aplicación, una ruta profunda recargada no
devuelve 404, y `pnpm test` corre limpio.

```
chore(config): scaffold vite react typescript project
chore(config): add eslint flat config and prettier
chore(config): set up vitest testing library and msw
chore(config): configure static deployment with spa fallback
```

---

## Fase 1 — Contratos

**Objetivo:** que todo lo que viaja por el cable tenga un esquema y un tipo inferido.

- Esquemas de los modelos: `Skill`, `Build`, `User` público, `Friendship`, `Battle`.
- Esquemas del combate: `CombatantView`, `TurnView`, `ReactionWindow`, `RatingChange`.
- `events` como **unión discriminada por `type`**, con las trece variantes de la sección 7.4.
- Enumeraciones estables: `SkillCode`, `BattleStatus`, `ConditionType`, `BattleErrorCode`,
  `BuildViolationRule`.
- Envoltorios de error: el del `ValidationPipe` y el de `violations`, que son distintos.
- Tipos inferidos y exportados. Ni un tipo escrito dos veces.

**Terminado cuando:** cada payload de ejemplo del guide valida contra su esquema en un test, y un
payload al que se le saca un campo obligatorio falla.

```
test(contracts): cover model schemas against guide payloads
feat(contracts): add model schemas for user build and skill
feat(contracts): add battle and combatant view schemas
feat(contracts): add discriminated union for battle events
feat(contracts): add error envelopes and stable enums
```

**Cuidado acá:** los esquemas van completos desde el principio. Descubrir el contrato pantalla por
pantalla genera esquemas parciales que después nadie completa, y el `switch` exhaustivo de la fase 9
deja de proteger.

---

## Fase 2 — Sesión y cliente HTTP

**Objetivo:** el núcleo transversal. Todo lo demás se apoya sobre esto.

- Store de sesión en Zustand con espejo en `localStorage`.
- Cliente HTTP con `Authorization: Bearer` automático.
- Validación de la respuesta contra el esquema correspondiente antes de devolverla.
- Interceptor de `401` con **refresh single-flight** y reintento único.
- Rotación: el par nuevo se guarda siempre; el viejo se descarta.
- Refresh fallido: limpiar sesión y navegar a `/login`.
- Traducción de errores HTTP a mensajes de juego, indexada por `code` o por `rule`.
- Ping a `GET /health` al arrancar, con pantalla de servidor despertando y contador.

**Terminado cuando:** un test con MSW demuestra que tres peticiones que fallan con `401` a la vez
disparan **un solo** refresh, que cada una se reintenta una vez, y que un refresh rechazado deja la
sesión limpia.

```
test(http): cover single flight refresh under concurrent failures
feat(auth): add session store with local storage mirror
feat(http): add api client with bearer token and schema validation
feat(http): add single flight refresh interceptor with retry
feat(http): map api errors to game messages by code
feat(config): add cold start health check screen
```

---

## Fase 3 — Sistema de diseño

**Objetivo:** el lenguaje visual completo, definido una vez.

- Variables CSS del tema: fondo, texto, texto tenue, acento, error, éxito, borde.
- Tipografía monoespaciada y escala tipográfica.
- Las seis primitivas: `Panel`, `CommandList`, `Prompt`, `StatBar`, `LogLine`, `Countdown`.
- `AppShell` con encabezado, área de contenido y pie de prompt.
- Foco de teclado visible y recorrido con `Tab` verificado.

**Terminado cuando:** una pantalla de muestra usa las seis primitivas, y toda la pantalla es
navegable sin mouse.

```
feat(ui): add console theme tokens and typography
feat(ui): add panel and stat bar primitives
feat(ui): add command list and prompt primitives
feat(ui): add log line and countdown primitives
feat(ui): add app shell layout
```

---

## Fase 4 — Registro de comandos

> **Ruta: SDD** — change `add-command-registry`. Rama `feat/add-command-registry`.

**Objetivo:** la pieza de la que cuelgan el clic y el teclado.

- Tipos `Command`, `CommandArg`, `CommandScope`, `CommandContext`, `CommandResult`.
- Registro con alta, filtrado por `scope` y evaluación de `isEnabled`.
- Resolvedor de texto: alias, argumentos, y sugerencia de candidatos ante un alias desconocido.
- Mapa `número → id` de la última lista, guardado en el contexto.
- `CommandList` conectado al registro; `Prompt` conectado al resolvedor.
- Argumentos de tipo `pick`: selector por clic, número por teclado.

**Terminado cuando:** un test demuestra que invocar por clic y por alias ejecutan el mismo comando
con los mismos argumentos, y que un comando deshabilitado se muestra con su motivo en vez de
esconderse.

```
test(commands): cover click and typed input resolving to same command
feat(commands): add command registry with scope filtering
feat(commands): add text resolver with alias suggestions
feat(commands): add numbered listing context for pick arguments
feat(ui): wire command list and prompt to the registry
```

---

## Fase 5 — Autenticación

**Objetivo:** entrar y salir de la aplicación.

- `/register`: `POST /auth/register` y, con éxito, `POST /auth/login` encadenado.
- `/login` con manejo de credenciales inválidas.
- `GET /auth/me` al arrancar con sesión guardada.
- Logout con `POST /auth/logout` y limpieza local.
- Componente de ruta protegida, con retorno a la ruta pedida después de entrar.
- Comandos `register`, `login`, `me`, `logout` en el registro.

**Terminado cuando:** un flujo de registro deja al usuario dentro del lobby, y recargar la página con
sesión guardada no pide credenciales otra vez.

```
test(auth): cover registration and login flows
feat(auth): add login screen
feat(auth): add registration screen chaining login
feat(auth): add protected route and session bootstrap
feat(auth): register auth commands
```

**Cuidado acá:** `register` devuelve **201 y el perfil, no tokens**. El login encadenado no es un
adorno: sin él, el usuario recién registrado queda afuera.

---

## Fase 6 — Catálogo y asistente de build

**Objetivo:** la pantalla donde más se gana, y la que mejor explica el juego.

- `GET /skills` una vez, cacheado sin caducidad.
- Tabla de costos de atributos y de modificadores en `builds/domain`.
- Asistente paso a paso: nombre, atributos, kit, confirmación.
- Presupuesto en vivo: costo del reparto y puntos restantes en cada cambio.
- Aviso de que 14 y 15 dan el mismo modificador y ninguna habilidad pide más de 14.
- Kit: acciones y reacciones con costo y requisito. **Las bloqueadas se muestran con el motivo.**
- Aviso de build sin respuesta contra magia cuando las dos reacciones son solo físicas.
- `POST /builds`, y renderizado de **todas** las `violations` cuando el servidor rechaza.
- `/builds` con lista, detalle, `PATCH` y `DELETE`.

**Terminado cuando:** una build ilegal muestra el arreglo completo de violaciones traducidas, y una
habilidad bloqueada dice exactamente qué atributo le falta y cuánto.

```
test(builds): cover attribute cost table and derived stats
feat(skills): fetch and cache the skill catalog
feat(builds): add attribute cost and modifier tables
feat(builds): add guided build wizard with live budget
feat(builds): show locked skills with their requirement
feat(builds): render server violations from build rejection
feat(builds): add build list detail and delete
```

---

## Fase 7 — Social y desafíos

**Objetivo:** todo lo que pasa antes de pelear.

- `/friends`: `GET /friendships` mostrando `direction` y `player` tal como llegan.
- Solicitar por id, aceptar, y `DELETE` con la etiqueta correcta según estado y dirección.
- `/leaderboard` con `limit`, y el id de cada jugador copiable — es de donde salen los rivales.
- `/battles`: lista con `role`, `rival` y `outcome` ya orientados.
- Desafiar eligiendo rival y build; aceptar eligiendo build; rechazar; cancelar.
- Aviso de que una pelea entre amigos llega con `ranked: false` y no mueve el rating.
- Comandos `friends`, `friend add`, `friend ok`, `battles`, `challenge`, `accept`, `top`.

**Terminado cuando:** se puede desafiar a alguien encontrado en el leaderboard y aceptar el desafío
desde la otra cuenta, sin tipear un uuid en ningún momento.

```
test(friendships): cover directional listing and delete semantics
feat(leaderboard): add ranking screen with copyable ids
feat(friendships): add friendship list with directional actions
feat(battles): add battle list with challenge and accept
feat(battles): register social and battle commands
```

**Cuidado acá:** `DELETE /friendships/:id` es un verbo para tres cosas. La etiqueta que ve el jugador
—rechazar, cancelar o eliminar— se decide con `status` y `direction`, que ya vienen resueltos. No hay
que comparar contra el propio id.

---

## Fase 8 — Conexión de combate

> **Ruta: SDD** — change `add-battle-realtime`. Rama `feat/add-battle-realtime`.

**Objetivo:** el transporte, con el store y sin pantalla todavía.

- `BattleSocket` sobre `socket.io-client`, con el token en `auth` del handshake.
- Manejo de `connect_error`: el socket rechazado nunca llega a existir.
- Suscripción única a los siete eventos del servidor, traducidos a acciones del store.
- Store de batalla con estado, registro acumulado, ventana abierta, abandono y último error.
- `battle:state` reemplaza; `turn_resolved` acumula.
- Reconexión automática y `battle:join` al recuperar la conexión.
- Reconexión del socket después de un refresh de token.
- Doble del socket para tests.

**Terminado cuando:** con el doble del socket, una secuencia de eventos deja el store exactamente
como el guide describe, incluida la reconexión con `openWindow` abierta.

```
test(realtime): cover store transitions for every server event
feat(realtime): add socket adapter with handshake auth
feat(realtime): translate server events into battle store actions
feat(realtime): reconnect and rejoin after drop or token refresh
```

---

## Fase 9 — Arena

> **Ruta: SDD** — change `add-battle-arena`. Rama `feat/add-battle-arena`. Se apoya en la
> especificación de la fase 8, que tiene que estar archivada antes de arrancar.

**Objetivo:** la pantalla de combate, en sus tres capas.

- `/battles/:id` montando el adapter una sola vez.
- **Stage:** los dos combatientes, vida, condiciones, ronda, iniciativa.
- **Log:** renderizador de `events` con `switch` exhaustivo y `assertNever`; `rolls` y `kept`
  mostrados cuando hubo ventaja o desventaja.
- Reconstrucción del registro desde `turns` y `combatants` cuando `events` viene vacío.
- **Prompt de acción:** las opciones salen de `skillCodes` cruzado con el catálogo, filtrando
  `ACTION`.
- **Prompt de reacción:** `applicableSkillCodes` tal cual llegan, más la opción de no reaccionar.
- Contador de quince segundos desde `remainingMs`. Al expirar **no se manda nada**.
- `battle:error` mostrado por `code`, sin cortar la sesión.
- Aviso de abandono del rival con su cuenta regresiva de dos minutos.

**Terminado cuando:** una ronda completa —acción, ventana, resolución, nueva ronda— se juega de punta
a punta contra la API real, y se puede jugar entera con clics o entera con el teclado.

```
test(arena): cover a full round from action to next round
feat(arena): add battle stage with hp conditions and round
feat(arena): add exhaustive event renderer for the battle log
feat(arena): add action prompt from frozen skill codes
feat(arena): add reaction prompt with countdown
feat(arena): handle battle errors and opponent abandonment
```

**Cuidado acá:** el menú de acciones sale de `skillCodes`, **nunca de `GET /builds`**. La build de hoy
puede no ser la que está peleando.

---

## Fase 10 — Cierre y rating

**Objetivo:** que la pelea termine bien contada.

- `battle:ended` con ganador, motivo y `ratingChanges` de **los dos** jugadores.
- Una pelea no puntuable muestra `change: 0`, no un campo ausente.
- Invalidación de las queries de batallas, leaderboard y perfil al terminar.
- Vuelta al lobby con el resultado visible.

**Terminado cuando:** al terminar una pelea puntuable, el leaderboard ya refleja el rating nuevo sin
recargar a mano.

```
feat(arena): add battle result screen with rating changes
feat(battles): invalidate battle and leaderboard queries on end
```

---

## Fase 11 — Pulido

**Objetivo:** los detalles que separan una demo de un producto.

- Estados vacíos con sentido en cada lista.
- Estados de carga y de error en cada pantalla, no solo en las felices.
- Ayuda: comando `help` que lista el registro del `scope` actual con sus alias.
- Revisión de accesibilidad: foco, `Tab`, etiquetas, contraste.
- `README` con capturas, decisiones y cómo levantarlo.

**Terminado cuando:** ninguna pantalla puede quedar en blanco sin decir por qué.

```
feat(ui): add empty and error states across screens
feat(commands): add help command listing the current scope
docs(readme): document setup decisions and screenshots
```

---

## Dependencias

```
Fase 0  Fundacion
   |
Fase 1  Contratos ─────────────┐
   |                           |
Fase 2  Sesion y HTTP          |
   |                           |
Fase 3  Sistema de diseno      |
   |                           |
Fase 4  Registro de comandos   |
   |                           |
   ├── Fase 5  Autenticacion   |
   |      |                    |
   |   Fase 6  Builds ─────────┤
   |      |                    |
   |   Fase 7  Social          |
   |      |                    |
   └── Fase 8  Conexion ───────┘
          |
       Fase 9  Arena
          |
       Fase 10 Cierre
          |
       Fase 11 Pulido
```

La fase 1 alimenta a todas: nada se construye sobre un contrato sin esquema. Las fases 5, 6 y 7 son
independientes entre sí una vez que existen las fases 2, 3 y 4, y podrían reordenarse. La 9 no
arranca sin la 8 terminada y probada con el doble.

---

## Puntos de control

Cinco momentos donde conviene frenar y verificar antes de seguir.

| Después de | Verificar |
| --- | --- |
| Fase 0 | Ruta profunda recargada en producción, sin 404 |
| Fase 2 | Tres `401` simultáneos, un solo refresh, sesión intacta |
| Fase 4 | El mismo comando por clic y por alias, con los mismos argumentos |
| Fase 6 | Build ilegal mostrando todas las violaciones traducidas |
| Fase 9 | Ronda completa contra la API real, jugable solo con teclado y solo con mouse |
