# Road to v1.0

**Web:**
- [ ] Request context (using ALS)
- [ ] Middlewares
- [ ] Request content type (other than JSON)
    - [ ] JSON should be default
- [x] Exception handlers (mapping custom exception to http exception)
    - [ ] More straightforward mapping via WebConfig (Map<MyError,HttpException>)
- [ ] Validate response
    - [ ] Strip unwanted keys
- [ ] Support other validators

**Database:**
- [ ] Provide an easy way to connect to database
- [ ] SQLite by default ?
- [ ] ORM adapters
    - [ ] Drizzle
    - [ ] MikroORM
    - [ ] Prisma