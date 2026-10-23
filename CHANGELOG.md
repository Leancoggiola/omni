## [1.0.2](https://github.com/Leancoggiola/omni/compare/v1.0.1...v1.0.2) (2026-06-19)


### Bug Fixes

* **ci:** validate semantic-release recovery after PoC ([693a33f](https://github.com/Leancoggiola/omni/commit/693a33fc981e0f2c5833f47776dda80efc56a5f1))
* **ci:** validate semantic-release recovery after PoC ([#25](https://github.com/Leancoggiola/omni/issues/25)) ([bb2f0ab](https://github.com/Leancoggiola/omni/commit/bb2f0ab163f6d28e4300dce0a7c5b42cd452701f))

## [1.0.1](https://github.com/Leancoggiola/omni/compare/v1.0.0...v1.0.1) (2026-05-19)


### Bug Fixes

* deploys y back merge ([6808079](https://github.com/Leancoggiola/omni/commit/6808079fec6fe272b9dfd7b427a87eaf4f48ab10))

# 1.0.0 (2026-05-19)


### Bug Fixes

* add rate limiting, fix CORS, and Spanish messages ([ca06cf3](https://github.com/Leancoggiola/omni/commit/ca06cf3fc151d1865a5e9b06383e441b53126b40))
* **api:** bind to 0.0.0.0 for Render port detection ([f38a25c](https://github.com/Leancoggiola/omni/commit/f38a25cd7cfe89d80de72f1af2210ef6f6820efc))
* **api:** do more controlled deploys ([5f446d3](https://github.com/Leancoggiola/omni/commit/5f446d32d79190ad5f63dcbe938444daa93ccb6a))
* **api:** do more controlled deploys ([78b70e6](https://github.com/Leancoggiola/omni/commit/78b70e69f59196b16dc8cee88aa9950f25fa1cb7))
* **api:** dockerfile ([8c89c6f](https://github.com/Leancoggiola/omni/commit/8c89c6f0776a2c71af686a10340c85b9c59106df))
* **api:** evitar carga de config en tests de vitest ([755ca7e](https://github.com/Leancoggiola/omni/commit/755ca7ea7ab5ebfd9379dd5af5cae0f5e475d52a))
* **api:** fix Dockerfile PNPM_HOME and .dockerignore symlink issue ([ab7794c](https://github.com/Leancoggiola/omni/commit/ab7794cae6150efbc85b495838e1a70e38ff7455))
* **api:** install prisma globally in Docker runner for migrate deploy ([e750353](https://github.com/Leancoggiola/omni/commit/e75035398fac5ee19d418d4428e2c20c932ca9ed))
* **api:** install prisma in builder stage before copy to runner ([0e26e2e](https://github.com/Leancoggiola/omni/commit/0e26e2e9f9f7d9441b1a0b009cbaf352939018cf))
* **api:** install prisma locally in Docker runner for migrate deploy ([0ad4324](https://github.com/Leancoggiola/omni/commit/0ad4324f60eb866cf0bef3d973a9b083135d5edc))
* **api:** move prisma to prod dependencies for Docker deploy ([83af68d](https://github.com/Leancoggiola/omni/commit/83af68d55fe951d37f76af63c41d2bc206b43175))
* **api:** removed deprecated methods ([3a55a5b](https://github.com/Leancoggiola/omni/commit/3a55a5ba894fd3faec8747e1a23d969902b17e7d))
* **api:** resolve Docker runtime issues with pnpm deploy and shared package bundling ([26d4ef6](https://github.com/Leancoggiola/omni/commit/26d4ef665a3643c6dd51bb11124f0ea04c889df1))
* **ci:** add dummy DATABASE_URL for prisma generate in CI ([c29ffb7](https://github.com/Leancoggiola/omni/commit/c29ffb7ff6be1b2c4c20a9a7861400ba8e1469ad))
* **ci:** deploy only when semantic-release publishes new version ([d1ccc72](https://github.com/Leancoggiola/omni/commit/d1ccc72fad22319a2c2782a4543236ce16e81a3e))
* **ci:** group security updates into single PR per ecosystem ([aab9512](https://github.com/Leancoggiola/omni/commit/aab9512426ab73a73aaabb70eb8404852a2c71eb))
* **ci:** replace invalid Dependabot property with open-pull-requests-limit 0 ([#14](https://github.com/Leancoggiola/omni/issues/14)) ([5f6c706](https://github.com/Leancoggiola/omni/commit/5f6c706cf79f2ae580c8e5edbce38a273e907b51))
* **ci:** replace invalid security-updates-only with limit 0 ([3a612e2](https://github.com/Leancoggiola/omni/commit/3a612e2a3bfaab8db34615fc2f7ff5ebae5cfbe1))
* **ci:** run prisma generate before check-types in turbo pipeline ([e5c087e](https://github.com/Leancoggiola/omni/commit/e5c087ea4e68e2eff97cacf794796c30cea01dc1))
* **ci:** use process.env for prisma config and rename generate task to db:generate ([e495f45](https://github.com/Leancoggiola/omni/commit/e495f45525aa761cc44b7354edfc0fbaaa849c6b))
* complete lazy-load config implementation in all modules ([45b9e86](https://github.com/Leancoggiola/omni/commit/45b9e86d21e9dcbd3651c01b8f37e25ffe88dba9))
* Rutas y eslint corregido en general ([6318a22](https://github.com/Leancoggiola/omni/commit/6318a220810d3eb1558af1139143baf1d2103a66))
* use relative path in root tsconfig extends ([eb8a746](https://github.com/Leancoggiola/omni/commit/eb8a7463c0eb8941ce1eaa6b60fca5698b5245e0))
* **web:** Vite alias fix ([e0be9b9](https://github.com/Leancoggiola/omni/commit/e0be9b9126f344ea81259750041e78df4e7506b4))


### Features

* access control with username auth and deployment config ([#15](https://github.com/Leancoggiola/omni/issues/15)) ([5b1e6a7](https://github.com/Leancoggiola/omni/commit/5b1e6a7398434bc30290ca7dfc9da114dcf166c6))
* añadido config de media ([a05515f](https://github.com/Leancoggiola/omni/commit/a05515f591acc02139d1d2cd27971960287a37fd))
* **api:** add admin routes, guard, and service for user management ([d014ffe](https://github.com/Leancoggiola/omni/commit/d014ffece38bd86b9ba8f62b1a5480bc9b43f50e))
* **api:** add admin seed script with prisma.config.ts integration ([ebfa8e7](https://github.com/Leancoggiola/omni/commit/ebfa8e74ce5edf24d60926bb34db0ccbd37f5f08))
* **api:** add health endpoint and document deployment setup in TODO ([3b6d41f](https://github.com/Leancoggiola/omni/commit/3b6d41f805f253bfe5bc7795ce68d9b2cf233cce))
* **api:** add pino structured logging and VSCode workspace config ([04e27d2](https://github.com/Leancoggiola/omni/commit/04e27d2fa0aa0ab8dd851765b75794a2c5f927b9))
* **api:** add username, role enum, make email optional in schema ([153bd9f](https://github.com/Leancoggiola/omni/commit/153bd9f27ce377cac80e50a79821b63ddd0d722c))
* **api:** devolver SessionUser en login, refresh y GET /api/auth/profile ([a4cabd0](https://github.com/Leancoggiola/omni/commit/a4cabd094a8de99b12ac369e640e8cd1d911ce1c))
* **api:** migrar campos de perfil y restringir actualización ([ea687af](https://github.com/Leancoggiola/omni/commit/ea687af71dc3cbcd461c09afc245624684b2290c))
* **ci:** update render.yaml, Dockerfile startup migrations, update TODO ([1002fee](https://github.com/Leancoggiola/omni/commit/1002fee1b5957c74daeddedca374b0ca34bedab0))
* dependencies fix ([0accb9c](https://github.com/Leancoggiola/omni/commit/0accb9c560f69728b68ed81bb83db64f215dbd7e))
* First release test ([#16](https://github.com/Leancoggiola/omni/issues/16)) ([b05ebdf](https://github.com/Leancoggiola/omni/commit/b05ebdf805758490dcfa9f2335f6c61b24cc670c))
* Layout y profile ([#17](https://github.com/Leancoggiola/omni/issues/17)) ([7fc685f](https://github.com/Leancoggiola/omni/commit/7fc685f885219912e6c90a700d6801b5733535b4))
* rework and next steps ([822f115](https://github.com/Leancoggiola/omni/commit/822f1150a4826021dac2992b8ff00ab1ba81aaaa))
* **shared:** agregar SessionUser y toSessionUser para respuestas de auth ([3deec77](https://github.com/Leancoggiola/omni/commit/3deec77f8592bad10ad49eab3df2b64a7fdc47d1))
* **shared:** extender tipos y schemas de perfil de usuario ([db983bb](https://github.com/Leancoggiola/omni/commit/db983bb89491bb01e18552856d29a7211d137aec))
* supabase and jwt improvements ([6c01a7a](https://github.com/Leancoggiola/omni/commit/6c01a7a1a20413d267390a4179bdfcbd2686d813))
* **web:** agregar tarjeta de saludo en inicio ([d5674e5](https://github.com/Leancoggiola/omni/commit/d5674e5b5a6501e8c58547f985eba653b4d310b3))
* **web:** rediseñar página de perfil con secciones Mantine ([a48ee67](https://github.com/Leancoggiola/omni/commit/a48ee67c7f3d89190c317542f5777b41b4ad4399))


### Performance Improvements

* **web:** usar solo useAuth en layout e inicio ([5ec3c60](https://github.com/Leancoggiola/omni/commit/5ec3c6006342ef982f2e0d9c4dd1d31b71b2b511))

# [1.0.0-rc.9](https://github.com/Leancoggiola/omni/compare/v1.0.0-rc.8...v1.0.0-rc.9) (2026-05-14)

### Bug Fixes

- **api:** bind to 0.0.0.0 for Render port detection ([f38a25c](https://github.com/Leancoggiola/omni/commit/f38a25cd7cfe89d80de72f1af2210ef6f6820efc))

# [1.0.0-rc.8](https://github.com/Leancoggiola/omni/compare/v1.0.0-rc.7...v1.0.0-rc.8) (2026-05-14)

### Bug Fixes

- **api:** move prisma to prod dependencies for Docker deploy ([83af68d](https://github.com/Leancoggiola/omni/commit/83af68d55fe951d37f76af63c41d2bc206b43175))

# [1.0.0-rc.7](https://github.com/Leancoggiola/omni/compare/v1.0.0-rc.6...v1.0.0-rc.7) (2026-05-14)

### Bug Fixes

- **api:** do more controlled deploys ([5f446d3](https://github.com/Leancoggiola/omni/commit/5f446d32d79190ad5f63dcbe938444daa93ccb6a))
- **api:** install prisma in builder stage before copy to runner ([0e26e2e](https://github.com/Leancoggiola/omni/commit/0e26e2e9f9f7d9441b1a0b009cbaf352939018cf))

# [1.0.0-rc.6](https://github.com/Leancoggiola/omni/compare/v1.0.0-rc.5...v1.0.0-rc.6) (2026-05-14)

### Bug Fixes

- **ci:** deploy only when semantic-release publishes new version ([d1ccc72](https://github.com/Leancoggiola/omni/commit/d1ccc72fad22319a2c2782a4543236ce16e81a3e))

# [1.0.0-rc.5](https://github.com/Leancoggiola/omni/compare/v1.0.0-rc.4...v1.0.0-rc.5) (2026-05-14)

### Bug Fixes

- **api:** do more controlled deploys ([78b70e6](https://github.com/Leancoggiola/omni/commit/78b70e69f59196b16dc8cee88aa9950f25fa1cb7))
- **api:** install prisma locally in Docker runner for migrate deploy ([0ad4324](https://github.com/Leancoggiola/omni/commit/0ad4324f60eb866cf0bef3d973a9b083135d5edc))

# [1.0.0-rc.4](https://github.com/Leancoggiola/omni/compare/v1.0.0-rc.3...v1.0.0-rc.4) (2026-05-14)

### Bug Fixes

- **api:** install prisma globally in Docker runner for migrate deploy ([e750353](https://github.com/Leancoggiola/omni/commit/e75035398fac5ee19d418d4428e2c20c932ca9ed))

# [1.0.0-rc.3](https://github.com/Leancoggiola/omni/compare/v1.0.0-rc.2...v1.0.0-rc.3) (2026-05-14)

### Bug Fixes

- **api:** dockerfile ([8c89c6f](https://github.com/Leancoggiola/omni/commit/8c89c6f0776a2c71af686a10340c85b9c59106df))

# [1.0.0-rc.2](https://github.com/Leancoggiola/omni/compare/v1.0.0-rc.1...v1.0.0-rc.2) (2026-05-14)

### Bug Fixes

- **api:** removed deprecated methods ([3a55a5b](https://github.com/Leancoggiola/omni/commit/3a55a5ba894fd3faec8747e1a23d969902b17e7d))

### Features

- access control with username auth and deployment config ([#15](https://github.com/Leancoggiola/omni/issues/15)) ([5b1e6a7](https://github.com/Leancoggiola/omni/commit/5b1e6a7398434bc30290ca7dfc9da114dcf166c6))
- **api:** add admin routes, guard, and service for user management ([d014ffe](https://github.com/Leancoggiola/omni/commit/d014ffece38bd86b9ba8f62b1a5480bc9b43f50e))
- **api:** add admin seed script with prisma.config.ts integration ([ebfa8e7](https://github.com/Leancoggiola/omni/commit/ebfa8e74ce5edf24d60926bb34db0ccbd37f5f08))
- **api:** add username, role enum, make email optional in schema ([153bd9f](https://github.com/Leancoggiola/omni/commit/153bd9f27ce377cac80e50a79821b63ddd0d722c))
- **ci:** update render.yaml, Dockerfile startup migrations, update TODO ([1002fee](https://github.com/Leancoggiola/omni/commit/1002fee1b5957c74daeddedca374b0ca34bedab0))

# 1.0.0-rc.1 (2026-05-13)

### Bug Fixes

- add rate limiting, fix CORS, and Spanish messages ([ca06cf3](https://github.com/Leancoggiola/omni/commit/ca06cf3fc151d1865a5e9b06383e441b53126b40))
- **api:** fix Dockerfile PNPM_HOME and .dockerignore symlink issue ([ab7794c](https://github.com/Leancoggiola/omni/commit/ab7794cae6150efbc85b495838e1a70e38ff7455))
- **api:** resolve Docker runtime issues with pnpm deploy and shared package bundling ([26d4ef6](https://github.com/Leancoggiola/omni/commit/26d4ef665a3643c6dd51bb11124f0ea04c889df1))
- **ci:** add dummy DATABASE_URL for prisma generate in CI ([c29ffb7](https://github.com/Leancoggiola/omni/commit/c29ffb7ff6be1b2c4c20a9a7861400ba8e1469ad))
- **ci:** group security updates into single PR per ecosystem ([aab9512](https://github.com/Leancoggiola/omni/commit/aab9512426ab73a73aaabb70eb8404852a2c71eb))
- **ci:** replace invalid Dependabot property with open-pull-requests-limit 0 ([#14](https://github.com/Leancoggiola/omni/issues/14)) ([5f6c706](https://github.com/Leancoggiola/omni/commit/5f6c706cf79f2ae580c8e5edbce38a273e907b51))
- **ci:** replace invalid security-updates-only with limit 0 ([3a612e2](https://github.com/Leancoggiola/omni/commit/3a612e2a3bfaab8db34615fc2f7ff5ebae5cfbe1))
- **ci:** run prisma generate before check-types in turbo pipeline ([e5c087e](https://github.com/Leancoggiola/omni/commit/e5c087ea4e68e2eff97cacf794796c30cea01dc1))
- **ci:** use process.env for prisma config and rename generate task to db:generate ([e495f45](https://github.com/Leancoggiola/omni/commit/e495f45525aa761cc44b7354edfc0fbaaa849c6b))
- use relative path in root tsconfig extends ([eb8a746](https://github.com/Leancoggiola/omni/commit/eb8a7463c0eb8941ce1eaa6b60fca5698b5245e0))

### Features

- añadido config de media ([a05515f](https://github.com/Leancoggiola/omni/commit/a05515f591acc02139d1d2cd27971960287a37fd))
- **api:** add health endpoint and document deployment setup in TODO ([3b6d41f](https://github.com/Leancoggiola/omni/commit/3b6d41f805f253bfe5bc7795ce68d9b2cf233cce))
- **api:** add pino structured logging and VSCode workspace config ([04e27d2](https://github.com/Leancoggiola/omni/commit/04e27d2fa0aa0ab8dd851765b75794a2c5f927b9))
- dependencies fix ([0accb9c](https://github.com/Leancoggiola/omni/commit/0accb9c560f69728b68ed81bb83db64f215dbd7e))
- rework and next steps ([822f115](https://github.com/Leancoggiola/omni/commit/822f1150a4826021dac2992b8ff00ab1ba81aaaa))
- supabase and jwt improvements ([6c01a7a](https://github.com/Leancoggiola/omni/commit/6c01a7a1a20413d267390a4179bdfcbd2686d813))
