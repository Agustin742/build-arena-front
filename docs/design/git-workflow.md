# Flujo de trabajo con Git

Cómo se rama, se commitea y se integra en este repositorio. El plan de fases está en
[`implementation-plan.md`](./implementation-plan.md).

Es el mismo flujo que el de la API, con los ámbitos adaptados al cliente. Que los dos repositorios
del proyecto se lean igual no es cosmético: el historial de los dos se corrige junto.

---

## Principios

1. **`main` siempre despliega.** Nunca se commitea directo sobre `main`. Si `main` está roto,
   producción está rota, y producción se mira desde el día uno.
2. **Ramas cortas.** Una rama vive horas o un par de días, no una semana. Cuanto más vive, más duele
   integrarla.
3. **Un commit, un cambio con sentido.** No se acumula un día entero en un commit, ni se parte una
   idea en seis.
4. **El historial se lee como el relato del proyecto.** `git log --oneline` sobre `main` tiene que
   contar qué se construyó y en qué orden. Eso es exactamente lo que se evalúa.

> La consigna es explícita: commits progresivos, nunca todo el proyecto en un commit final, y nada de
> `cambios`, `avance`, `arreglos`, `commit final`, `cosas` ni `asdf`.

---

## Ramas

### Estructura

Una sola rama permanente:

```
main                          siempre desplegable
  └─ feat/command-registry     rama corta
  └─ feat/build-wizard
  └─ fix/refresh-race
```

**No hay `develop`.** Este es un proyecto individual con despliegue continuo a un único entorno. Una
rama de integración separada de `main` resuelve el problema de coordinar varios equipos hacia una
fecha de lanzamiento, y ese problema no existe acá. Es una decisión, no una omisión.

### Nomenclatura

El prefijo de la rama es **el mismo tipo que va a llevar el commit**, seguido de una descripción
corta en inglés y en `kebab-case`.

```
<type>/<short-description>
```

| Rama | Para qué |
| --- | --- |
| `feat/command-registry` | Funcionalidad nueva |
| `fix/refresh-race` | Corrección de un defecto |
| `chore/vite-scaffold` | Herramientas, configuración, dependencias |
| `docs/design-docs` | Documentación |
| `test/event-renderer-branches` | Solo tests |
| `refactor/extract-battle-store` | Reestructurar sin cambiar comportamiento |

### Tamaño de una rama

Una rama cubre **una unidad de trabajo**, no una fase entera. Una fase del plan son entre tres y seis
ramas.

Ejemplo de la fase 6:

```
feat/skill-catalog-cache
feat/attribute-cost-tables
feat/build-wizard
feat/build-violations
feat/build-crud-screens
```

Si una rama acumula más de unos diez commits, casi siempre eran dos ramas.

---

## Conventional Commits

### Anatomía

```
<type>(<scope>): <description>

[cuerpo opcional]

[pie opcional]
```

### Tipos

| Tipo | Cuándo |
| --- | --- |
| `feat` | Funcionalidad nueva visible para quien usa la aplicación |
| `fix` | Corrección de un comportamiento defectuoso |
| `docs` | Solo documentación |
| `test` | Agregar o corregir tests |
| `refactor` | Cambio interno que no altera el comportamiento |
| `chore` | Configuración, dependencias, andamiaje |
| `perf` | Mejora de rendimiento |
| `style` | Solo estética, sin cambio de comportamiento |
| `build` | Sistema de build o empaquetado |
| `ci` | Integración continua |

### Ámbitos de este repositorio

El `scope` nombra la carpeta tocada:

```
auth  builds  skills  friendships  battles  arena  leaderboard
contracts  http  realtime  commands  ui  config
design  readme  git
```

Los tres de la última línea no son carpetas de `src/`: nombran la superficie tocada cuando el cambio
es de documentación o de proceso.

`arena` se separa de `battles` a propósito: `battles` es la lista y las transiciones por REST,
`arena` es la pantalla de combate en vivo. Son dos superficies distintas y conviene poder leerlas
separadas en el historial.

### Reglas del mensaje

- **En inglés**, como todo el código.
- **Modo imperativo**: `add`, no `added` ni `adds`. El commit describe qué hace al aplicarse.
- **Minúscula inicial** en la descripción, **sin punto final**.
- **Máximo 72 caracteres** en la primera línea.
- El **cuerpo explica el porqué**, no el qué. El qué ya está en el diff.

### Ejemplos correctos

```
feat(contracts): add discriminated union for battle events
feat(http): add single flight refresh interceptor with retry
feat(commands): add command registry with scope filtering
feat(builds): show locked skills with their requirement
fix(realtime): rejoin battle room after socket reconnect
test(arena): cover a full round from action to next round
refactor(ui): extract countdown out of the reaction prompt
docs(design): document the three layers of the arena
chore(config): configure static deployment with spa fallback
```

### Ejemplos incorrectos

| Mensaje | Qué está mal |
| --- | --- |
| `cambios` | Prohibido por la consigna. No dice nada |
| `feat: stuff` | Sin ámbito y sin contenido |
| `Added the login screen.` | Pasado, mayúscula, punto final, sin tipo |
| `feat(ui): add login and build wizard and fix socket` | Tres cambios en un commit |
| `wip` | No llega a `main` jamás |

---

## Flujo de trabajo

```
1.  git switch main
2.  git pull
3.  git switch -c feat/command-registry
4.  trabajar, commiteando de a cambios con sentido
5.  git push -u origin feat/command-registry
6.  abrir pull request hacia main
7.  releer el propio diff antes de integrar
8.  integrar con squash, o con merge commit si la rama es parte de una pila
9.  verificar que el despliegue quedo verde
```

Las ramas remotas no se borran: quedan como registro del proceso, que es parte de lo que se evalúa.

El paso 7 no es decorativo. **Leer el propio diff en la interfaz de GitHub encuentra cosas que no se
ven en el editor**: un `console.log` olvidado, un archivo que no correspondía, una `VITE_API_URL`
apuntando a `localhost`. Trabajar solo no elimina la revisión; la vuelve tu responsabilidad.

### Pull requests

- **El título del pull request es un Conventional Commit**, porque al integrar con squash se
  convierte en el commit de `main`.
- El cuerpo dice qué resuelve y qué fase del plan cubre.
- Se integran de a uno, verificando el despliegue después de cada uno.

### Estrategia de integración: squash

Cada pull request se convierte en **un commit limpio en `main`**. Consecuencias:

- `main` se lee como un registro de cambios: un commit por unidad de trabajo, todos en Conventional
  Commits.
- Los commits intermedios de la rama —incluidos los tanteos— quedan en el pull request, visibles pero
  fuera del historial principal.
- El historial es lineal, sin telaraña de merges.

Esto **no** contradice el requisito de commits progresivos: al final `main` tiene decenas de commits
con sentido repartidos en semanas, no uno solo.

### Excepción: pilas de pull requests

Lo de arriba vale para un pull request suelto contra `main`. **Cuando hay una pila —cada rama cortada
de la anterior— se integra con merge commit, no con squash.**

El motivo no es preferencia. El squash toma los commits de la rama y los aplasta en **uno nuevo, con
un hash que nunca existió**. Las ramas de arriba están construidas sobre los commits originales, así
que git termina comparando contra un commit que no es ancestro de nada de lo que conocen, y aparecen
conflictos en archivos que nadie tocó dos veces.

Con merge commit, los commits de la rama de abajo quedan como ancestros reales de `main`. Al cambiar
la base de la rama siguiente, git ya los reconoce y el diff muestra solamente lo nuevo.

El procedimiento:

1. Integrar de abajo hacia arriba, de a uno.
2. Después de cada integración, cambiar la base del pull request siguiente a `main` **a mano**.
3. Verificar el despliegue antes de seguir con el próximo.

> GitHub reapunta solo la base de los pull requests hijos **únicamente si se borra la rama al
> integrar**. Este proyecto no borra ramas, así que el paso 2 es manual y no opcional.

### Protección de `main`

Misma decisión que en la API: **configuración por defecto, sin protección de rama.**

La consecuencia hay que asumirla con los ojos abiertos: **nada impide técnicamente commitear directo
sobre `main`.** El flujo de este documento pasa a ser disciplina personal en lugar de una regla que
la herramienta hace cumplir. Se sigue igual: rama, pull request, relectura del propio diff,
integración.

Si aparece un commit directo sobre `main` que no sea el inicial, la regla se rompió sola. Ahí
conviene activar la protección.

---

## Qué nunca se commitea

```
.env
.env.local
node_modules/
dist/
coverage/
*.log
```

`.env` va en `.gitignore` **desde el primer commit**.

`.env.example` sí se commitea, con las claves y sin valores:

```
VITE_API_URL=
```

> En un cliente web **ninguna variable es secreta**: todo lo que empieza con `VITE_` se compila
> dentro del bundle y cualquiera lo lee. `VITE_API_URL` es configuración, no un secreto. Si alguna
> vez hace falta una clave privada, no va acá: va del lado del servidor.

---

## Automatización opcional

`commitlint` con `husky` rechaza un commit mal formado en el momento de escribirlo, en lugar de
descubrirlo al revisar el historial en la última semana.

```bash
pnpm add -D @commitlint/cli @commitlint/config-conventional husky
pnpm exec husky init
```

`commitlint.config.js`:

```javascript
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      [
        'auth',
        'builds',
        'skills',
        'friendships',
        'battles',
        'arena',
        'leaderboard',
        'contracts',
        'http',
        'realtime',
        'commands',
        'ui',
        'config',
        'design',
        'readme',
        'git',
      ],
    ],
  },
}
```

`.husky/commit-msg`:

```bash
pnpm exec commitlint --edit "$1"
```

No es obligatorio, pero cuesta cinco minutos y elimina una clase entera de error.

---

## Relación con las fases

Cada fase del plan se cubre con varias ramas. Ejemplo completo de la fase 2:

| Rama | Commits |
| --- | --- |
| `feat/session-store` | `feat(auth): add session store with local storage mirror` |
| `feat/api-client` | `feat(http): add api client with bearer token and schema validation` |
| `feat/refresh-interceptor` | `test(http): cover single flight refresh under concurrent failures`<br>`feat(http): add single flight refresh interceptor with retry` |
| `feat/error-mapping` | `feat(http): map api errors to game messages by code` |
| `feat/cold-start-screen` | `feat(config): add cold start health check screen` |

Con TDD estricto, el commit de test va **antes** que el de implementación dentro de la misma rama.
El pull request muestra la secuencia: primero la prueba que falla, después el código que la hace
pasar.
