# Diseño general — Build Arena Web

Cliente web de Build Arena: pantallas ruteadas con estética de consola y una arena de combate
conversacional, contra la API de duelos por turnos documentada en
[`docs/frontend-guide.md`](../frontend-guide.md).

> **Convención de este repositorio:** la documentación se escribe en español; carpetas, archivos,
> código, rutas, eventos, campos y componentes se escriben en inglés. El código no lleva comentarios.

| | |
| --- | --- |
| API | `https://build-arena-api.onrender.com` |
| WebSocket | la misma URL, Socket.IO |
| Contrato completo | [`docs/frontend-guide.md`](../frontend-guide.md) |
| Repositorio de la API | proyecto hermano `4-agosto` |

---

## 1. La tesis del cliente

El backend se apoya en una frase: **si el cliente puede calcularlo, el cliente puede mentirlo.**

Vista desde este lado, esa frase se convierte en otra:

> **Este front no tiene dominio propio. Es un renderizador de intención y de eventos.**

No tira dados. No calcula daño. No decide de quién es el turno. No determina si una build es legal
ni si una reacción está disponible. Declara `quiero atacar con esta habilidad` y espera que el
servidor le diga qué pasó.

La consecuencia es concreta y ordena todo lo demás: **si aparece un `if` sobre reglas de juego, esa
línea está en el lugar equivocado.** Todo lo que hay que mostrar ya viene resuelto en la respuesta o
en el evento.

### La única excepción, y por qué existe

La tabla de costos de atributos de la sección 5 del guide vive en el front. No es una fisura en la
tesis: es una **ayuda visual** para que el asistente de build muestre el presupuesto en vivo mientras
el jugador mueve los números, sin un viaje al servidor por cada tecla.

La regla que la mantiene honesta es que **el servidor valida igual y su respuesta manda**. Si el
cálculo local dijera que la build es legal y el servidor devolviera `400`, gana el servidor y se
muestran sus `violations`. El front no discute.

---

## 2. Qué es este cliente

Tres frases que lo definen, y de las que salen casi todas las decisiones técnicas.

**Es una aplicación con pantallas reales.** Rutas, navegación, historial del navegador, enlaces que
se pueden compartir. No es un terminal de una sola vista.

**Con estética de consola.** Tipografía monoespaciada, paleta oscura de pocos colores, bordes de
caracteres, listas numeradas, sin sombras ni animaciones decorativas. El aspecto es de terminal; la
estructura, de aplicación.

**Y una arena conversacional.** El combate se lee como un registro que crece: la narración que llega
en `events` se escribe línea por línea, y las opciones aparecen como un prompt al pie.

---

## 3. Decisiones de diseño

Cada decisión con su razón, porque la pregunta interesante nunca es *qué* se eligió.

### 3.1 Clic primero, teclado opcional

El jugador **nunca está obligado a escribir**. Toda acción disponible aparece como una opción
numerada y clickeable. Escribir el comando es un atajo para quien ya lo sabe, no el camino de
entrada.

**La consecuencia arquitectónica es la pieza central del proyecto.** Dos formas de invocar la misma
acción son dos oportunidades de desincronizarse: se agrega un comando, se lo cablea en la lista de
botones y se olvida en el parser, o al revés. Se descubre tarde y siempre en el comando que menos se
usa.

Por eso las dos entradas se apoyan sobre un único **Command Registry**: la lista clickeable se
renderiza desde el registro y el texto tipeado se resuelve contra el mismo registro. Una fuente de
verdad, dos formas de invocarla. El detalle está en
[`architecture.md`](./architecture.md#3-command-registry-la-pieza-central).

### 3.2 La arena se parte en tres capas

La vista de combate no es un componente: son tres, apilados y con responsabilidades separadas.

| Capa | Qué muestra | Por qué está sola |
| --- | --- | --- |
| **Stage** | Los dos combatientes, vida, condiciones, ronda | Es la capa que va a recibir los modelos ASCII |
| **Log** | La narración de `events`, en orden, acumulada | Solo transforma eventos en líneas; no sabe de turnos |
| **Prompt** | Las opciones de la acción o de la ventana de reacción | Es el único punto que emite mensajes al servidor |

Hoy el stage son dos barras y un par de etiquetas. **Está separado desde el día uno para que el día
que entren los modelos ASCII no haya que abrir el log ni el prompt.** Es la diferencia entre agregar
una funcionalidad y rehacer la pantalla.

### 3.3 Tres clases de estado, tres herramientas

Meter todo en un store único es el error clásico de este tipo de aplicación. Acá el estado se
clasifica por **origen**, no por pantalla.

| Clase | Ejemplo | Herramienta | Por qué |
| --- | --- | --- | --- |
| **Server state** | builds, amistades, batallas, leaderboard, catálogo | TanStack Query | Es una copia local de datos que viven en el servidor: necesita cache, invalidación, reintento y estados de carga. Escribirlo a mano es reescribir Query peor |
| **Stream state** | todo lo que llega por WebSocket durante una batalla | Zustand | **No es cacheable ni se puede volver a pedir.** Nadie refetchea un `turn_resolved`: llega una vez y se acumula. Modelarlo como una query es forzarlo |
| **UI state** | el input abierto, el paso del asistente, el foco | `useState` local | Muere con el componente. No merece un store |

La sesión (`accessToken`, `refreshToken`, usuario actual) es un cuarto caso: vive en un store chico
de Zustand con espejo en `localStorage`, porque la necesitan tanto el cliente HTTP como el socket, y
ninguno de los dos es un componente de React.

### 3.4 El catálogo se pide una vez

`GET /skills` devuelve doce habilidades que no cambian entre despliegues. Se trae al arrancar, se
guarda con `staleTime` infinito y se consulta desde memoria. **Todo lo demás del juego se cruza
contra ese catálogo**: la build, el kit congelado de una batalla, las opciones de una ventana de
reacción.

### 3.5 En combate, el menú sale de `skillCodes`, nunca de la build

Al aceptar un desafío, el servidor congela atributos y kit. Editar la build después no cambia esa
pelea. El menú de acciones se arma cruzando `skillCodes` de `battle:state` con el catálogo y
filtrando por `type: ACTION`.

**Llamar a `GET /builds` para esto es un defecto**, no una alternativa: devuelve la build de ahora, y
la que está peleando es la que se congeló al aceptar.

### 3.6 Las opciones de reacción llegan resueltas

`battle:reaction_window` trae `applicableSkillCodes` ya filtrado por tipo de ataque y por
disponibilidad. Se ofrece esa lista tal cual llega. Filtrarla de nuevo en el front sería replicar
reglas de combate, que es exactamente lo que la tesis prohíbe.

### 3.7 Las violaciones se muestran todas juntas

Cuando una build es ilegal, el servidor devuelve el arreglo completo de `violations`, no la primera.
Se muestran todas, cada una con su `rule` traducida a lenguaje de juego.

Mostrar una sola obliga al jugador a descubrir sus errores de a uno, con un viaje al servidor entre
cada uno. El servidor ya hizo el trabajo de juntarlos.

### 3.8 Los errores se mapean por `code`, jamás por `message`

`battle:error` trae `code` estable y `message` en inglés y en tono de sistema. La traducción a texto
de juego se hace con una tabla indexada por `code`.

Comparar contra el texto ata el front a una cadena que el backend puede reescribir sin avisar,
porque para el backend **es** libre de reescribirla: el contrato es el código.

Lo mismo vale para las `violations` de build y para los errores HTTP.

### 3.9 Las listas se numeran y el mapa se guarda

Nadie tipea un uuid. Cada lista que se muestra guarda su mapa `número → id`, y ese número es lo que
acepta tanto el clic como el teclado. Es la misma decisión que toma el guide en su sección 8.2, y es
la que hace que el comando escrito sea usable.

### 3.10 El arranque en frío es parte de la interfaz

El plan gratuito de Render apaga el servicio tras quince minutos sin tráfico, y la primera petición
después tarda cerca de un minuto y medio.

Un formulario de login que se queda pensando noventa segundos parece roto. Por eso la aplicación
hace `GET /health` al arrancar y, si tarda, muestra una pantalla que **dice lo que está pasando** con
un contador. Es una limitación del hosting convertida en información, en vez de en una pantalla
congelada.

### 3.11 Sin librería de componentes

No entra shadcn, ni MUI, ni Chakra. Un kit de componentes trae su propio lenguaje visual —bordes
redondeados, sombras, elevaciones, transiciones— y toda la estética de consola consiste en
apagarlo. Se termina peleando contra la librería en cada componente.

Se construye un kit propio de seis primitivas: `Panel`, `CommandList`, `Prompt`, `StatBar`,
`LogLine`, `Countdown`. Con eso se arma la aplicación entera.

---

## 4. Stack

| Pieza | Elección | Por qué, y qué se descartó |
| --- | --- | --- |
| Base | **React + Vite + TypeScript** | El contrato del cable es grande y discriminado por campos (`events`, `battle:error`, `violations`). Sin tipos, cada `switch` es una bomba de tiempo. Vite por velocidad de arranque y por no necesitar SSR: es una aplicación detrás de login, no una página que se indexe |
| Ruteo | **React Router** | Las pantallas existen y tienen que ser direccionables |
| Server state | **TanStack Query** | Cache, invalidación, reintento y estados de carga resueltos. La alternativa era `useEffect` con `useState`, que es escribir Query mal |
| Tiempo real | **socket.io-client** | Lo exige la API: es Socket.IO, no WebSocket nativo. No es intercambiable |
| Stream state | **Zustand** | Un store chico, sin ceremonia y legible desde fuera de React —lo necesita el adapter de socket—. Redux Toolkit resolvía lo mismo con cuatro veces más código; Context sufría re-renders en cada evento |
| Contratos | **Zod** | Valida en el borde lo que entra del cable y de ahí infiere los tipos. Una fuente, no dos |
| Estilos | **Tailwind** con variables CSS | El tema de consola vive en variables; Tailwind compone. Sin CSS-in-JS: no hace falta estilo dinámico en tiempo de ejecución |
| Tests | **Vitest, Testing Library, MSW** | Vitest comparte configuración con Vite. MSW intercepta a nivel de red, así que los tests ejercitan el cliente HTTP de verdad, no un doble de `fetch` |
| Gestor de paquetes | **pnpm** | El mismo que la API |

---

## 5. Mapa de pantallas

```
/login                    publico
/register                 publico
/                         lobby: resumen, accesos, comandos
/builds                   lista de builds
/builds/new               asistente de creacion
/builds/:id               detalle y edicion
/friends                  solicitudes y amistades
/battles                  desafios y batallas
/battles/:id              arena (WebSocket)
/leaderboard              ranking
```

### Máquina de estados

```
   ANONYMOUS ──login──> LOBBY
                          │
        ┌─────────────────┼──────────────┬──────────────┐
        │                 │              │              │
     builds           friends         battles      leaderboard
        │                                │
        └──────── build elegida ─────────┤
                                         │ accept
                                         ▼
                                  ARENA (WebSocket)
                                         │
                       ┌─────────────────┴─────────────────┐
                       │                                   │
                   MI TURNO                            SU TURNO
              (elegir una accion)             (esperar, o responder
                       │                       la ventana en 15s)
                       └─────────────────┬─────────────────┘
                                         ▼
                                   turn_resolved
                                         │
                              defeatedId? ── si ──> ENDED
                                         │ no
                                    round_start
```

---

## 6. Estética de consola: qué significa concretamente

No es un filtro decorativo. Son reglas verificables.

| Regla | Concreto |
| --- | --- |
| Tipografía | Una sola familia monoespaciada, dos pesos |
| Paleta | Fondo oscuro, texto tenue, un color de acento, uno de error, uno de éxito. Nada más |
| Formas | Bordes de un píxel. Sin radios grandes, sin sombras, sin degradados |
| Movimiento | Solo donde comunica: el cursor del prompt y el contador de la ventana de reacción |
| Alineación | Todo en grilla de caracteres: las listas numeradas y las columnas alinean |
| Densidad | Alta. Se prefiere una pantalla que se lee entera a tres que se navegan |

Y una regla que la estética no puede pisar: **el foco del teclado siempre visible y las opciones
alcanzables con `Tab`.** Una interfaz que imita un terminal y no se puede recorrer con el teclado
está imitando lo de afuera y olvidando lo de adentro.

---

## 7. Alcance

### Núcleo

- Registro, login, refresh con rotación, logout, sesión persistida
- Catálogo cacheado
- Asistente de build con presupuesto en vivo, habilidades bloqueadas con motivo y `violations` del servidor
- Builds: listar, ver, editar, borrar
- Amistades: solicitar, aceptar, rechazar, cancelar, eliminar
- Desafíos: crear, aceptar con build, rechazar, cancelar
- Leaderboard
- Arena completa: acción, ventana de reacción con contador, narración, reconexión, abandono del rival, cierre con `ratingChanges`

### Fuera del núcleo, previsto en el diseño

- **Modelos ASCII de los combatientes** en el stage. Es la razón por la que el stage es una capa propia
- Temas alternativos sobre las mismas variables CSS
- Sonido de terminal
- Historial navegable de batallas terminadas, reconstruido desde `turns`

---

## 8. Riesgos conocidos

| Riesgo | Mitigación |
| --- | --- |
| El arranque en frío de Render parece una aplicación rota | Ping a `/health` al arrancar, con pantalla explícita y contador (§3.10) |
| El `accessToken` vence en medio de una batalla | Refresh single-flight y **reconexión del socket** después de renovar. El token del handshake no se revalida solo |
| Se cae el socket y el jugador pierde la ventana de reacción | Reconexión automática y `battle:join`; `battle:state` devuelve `openWindow` con su `remainingMs` |
| `events` llega vacío en un re-emit idempotente | El renderizado cae a `turns` y `combatants`, que sí son el contrato |
| Filtrar reacciones u ocultar opciones "de más" | Prohibido por §3.6. Se ofrece `applicableSkillCodes` tal cual llega |
| Reimplementar reglas para previsualizar el daño | Prohibido por §1. La única previsualización permitida es la de valores derivados de la sección 5 del guide, y va marcada como estimación |
