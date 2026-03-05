# Changelog

## [0.2.0](https://github.com/Aygentic/Aygentic-starter-template/compare/backend-v0.1.0...backend-v0.2.0) (2026-03-05)


### Features

* **api:** add Entity CRUD REST endpoints with auth and pagination [AYG-70] ([#7](https://github.com/Aygentic/Aygentic-starter-template/issues/7)) ([4140280](https://github.com/Aygentic/Aygentic-starter-template/commit/4140280c07b6dd65906c923d1a1a637a88225f6b))
* **api:** add operational endpoints health/readiness/version [AYG-68] ([#4](https://github.com/Aygentic/Aygentic-starter-template/issues/4)) ([1c01590](https://github.com/Aygentic/Aygentic-starter-template/commit/1c0159093ac28ac74bcc66c34db0708832caad93))
* **api:** wire app assembly with lifespan, Sentry, and error tests [AYG-71] ([#9](https://github.com/Aygentic/Aygentic-starter-template/issues/9)) ([fbbf818](https://github.com/Aygentic/Aygentic-starter-template/commit/fbbf818fafd7a2bef534121697625b97a47f70d9))
* **core:** add structured logging and request pipeline middleware [AYG-66] ([#2](https://github.com/Aygentic/Aygentic-starter-template/issues/2)) ([f57968b](https://github.com/Aygentic/Aygentic-starter-template/commit/f57968ba05f2440ea39c635ea341d2b4f065a404))
* **core:** add Supabase client, Clerk auth, and HTTP client with typed deps [AYG-67] ([#3](https://github.com/Aygentic/Aygentic-starter-template/issues/3)) ([70669ef](https://github.com/Aygentic/Aygentic-starter-template/commit/70669ef1facd1e96d0dad39f118cc308517bf479))
* **core:** rewrite config, error handlers, and shared models [AYG-65] ([#1](https://github.com/Aygentic/Aygentic-starter-template/issues/1)) ([c10f1bf](https://github.com/Aygentic/Aygentic-starter-template/commit/c10f1bfbca685ec93ac8d09439357060f70e5aa2))
* **entity:** add Entity models, service layer, and database migration [AYG-69] ([#6](https://github.com/Aygentic/Aygentic-starter-template/issues/6)) ([abba475](https://github.com/Aygentic/Aygentic-starter-template/commit/abba475e0d3bfb82497fe75d3d2d2451ab802bf1))
* **frontend:** clean frontend for microservice starter template [AYG-76] ([#14](https://github.com/Aygentic/Aygentic-starter-template/issues/14)) ([88aab35](https://github.com/Aygentic/Aygentic-starter-template/commit/88aab35e90bd1783b71dd7fa4c1795cef0597b88))
* **infra:** Docker, CI & legacy cleanup for Supabase/Clerk migration [AYG-72] ([#10](https://github.com/Aygentic/Aygentic-starter-template/issues/10)) ([1de2777](https://github.com/Aygentic/Aygentic-starter-template/commit/1de27773783d2ddbb29e2dd93f12b38bf597b389))


### Bug Fixes

* **auth:** update Clerk SDK to v5 and fix v2 session token compatibility [AYG-75] ([#13](https://github.com/Aygentic/Aygentic-starter-template/issues/13)) ([3c89da5](https://github.com/Aygentic/Aygentic-starter-template/commit/3c89da59ebd49407b03eab6e05be835d94d384ec))
* **ci:** repair broken CI workflow and clean up GitHub Actions ([#15](https://github.com/Aygentic/Aygentic-starter-template/issues/15)) ([3f3a85d](https://github.com/Aygentic/Aygentic-starter-template/commit/3f3a85d91289c880aa5b7cb7c6ff31be04631dab))


### Miscellaneous

* **ci,tests:** production hardening — security, frontend tests, CI/CD (AYG-89) ([#16](https://github.com/Aygentic/Aygentic-starter-template/issues/16)) ([7cfb32d](https://github.com/Aygentic/Aygentic-starter-template/commit/7cfb32dd5b5961c91ee0df8d5e16967e7a5232f4))
* **ci,tests:** production hardening — security, frontend tests, CI/CD (AYG-89) ([#17](https://github.com/Aygentic/Aygentic-starter-template/issues/17)) ([deab70c](https://github.com/Aygentic/Aygentic-starter-template/commit/deab70c9e263b0551dfba33a4bf05327a49edee3))


### Documentation

* **api:** update AYG-70 entity docs after merge ([#8](https://github.com/Aygentic/Aygentic-starter-template/issues/8)) ([527d999](https://github.com/Aygentic/Aygentic-starter-template/commit/527d9999492ffd65f6eeeeb85502a2c92f646ec4))
* remove legacy FastAPI template remnants from docs and scripts ([b7b723a](https://github.com/Aygentic/Aygentic-starter-template/commit/b7b723a6748f1eb23df347f3ae33c5b6ab9400e2))
