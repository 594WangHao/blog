var settings = require('../settings'),
    Db = require('mongodb').Db,
    Connection = require('mongodb').Connection,
    Server = require('mongodb').Server;

// 设置数据库名、端口、创建链接
module.exports = new Db(settings.db, new Server(settings.host, settings.port), {safe: true});
