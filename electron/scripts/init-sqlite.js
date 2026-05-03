const { createSqliteService } = require('../services/sqliteService');

const service = createSqliteService({ app: null });
console.log(JSON.stringify(service.getDbStats(), null, 2));
