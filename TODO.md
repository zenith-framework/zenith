# Road to v1.0

**Web:**
- [ ] Query parameters
- [ ] Middlewares
- [ ] Request input Validation
    - [ ] Body
    - [ ] Query parameters
- [ ] Guards
- [ ] Request context (using ALS)
- [ ] Request content type (other than JSON)
    - [ ] JSON should be default
- [x] Exception handlers (mapping custom exception to http exception)
    - [ ] More straightforward mapping via WebConfig (Map<MyError,HttpException>)

**Database:**
- [ ] Provide an easy way to connect to database
- [ ] SQLite by default ?
- [ ] ORM adapters
    - [ ] Drizzle
    - [ ] MikroORM
    - [ ] Prisma