
/**
 * Module dependencies
 */

var async = require('async'),
    MongoClient = require('mongodb').MongoClient;

/**
 * Manage a connection to a Mongo Server
 *
 * @param {Object} config
 * @return {Object}
 * @api private
 */

var Connection = module.exports = function Connection(config, cb) {
  var self = this;

  // Hold the config object
  this.config = config || {};

  // Build Database connection
  this._buildConnection(function(err, db) {
    if(err) return cb(err);
    if(!db) return cb(new Error('no db object'));

    // Store the DB object
    self.db = db;

    // Return the connection
    cb(null, self);
  });
};


/////////////////////////////////////////////////////////////////////////////////
// PUBLIC METHODS
/////////////////////////////////////////////////////////////////////////////////


/**
 * Create A Collection
 *
 * @param {String} name
 * @param {Object} collection
 * @param {Function} callback
 * @api public
 */

Connection.prototype.createCollection = function createCollection(name, collection, cb) {
  var self = this;

  // Create the Collection
  this.db.createCollection(name, function(err, result) {
    if(err) return cb(err);

    // Create Indexes
    self._ensureIndexes(result, collection.indexes, cb);
  });
};

/**
 * Drop A Collection
 *
 * @param {String} name
 * @param {Function} callback
 * @api public
 */

Connection.prototype.dropCollection = function dropCollection(name, cb) {
  this.db.collection(name).drop(cb);
};


/////////////////////////////////////////////////////////////////////////////////
// PRIVATE METHODS
/////////////////////////////////////////////////////////////////////////////////


/**
 * Build Server and Database Connection Objects
 *
 * @param {Function} callback
 * @api private
 */

Connection.prototype._buildConnection = function _buildConnection(cb) {
  // Build connection options
  const options = {
    // Server options
    directConnection: this.config.directConnection,
    tls: this.config.tls,
    maxPoolSize: this.config.maxPoolSize,
    minPoolSize: this.config.minPoolSize,
    maxIdleTimeMS: this.config.maxIdleTimeMS,
    connectTimeoutMS: this.config.connectTimeoutMS,
    socketTimeoutMS: this.config.socketTimeoutMS,
    
    // Write concern and read preference
    writeConcern: this.config.writeConcern,
    readPreference: this.config.readPreference,
    
    // Additional options
    retryWrites: this.config.retryWrites,
    retryReads: this.config.retryReads,
    forceServerObjectId: this.config.forceServerObjectId,
    
    // Auth options if provided
    auth: this.config.user && this.config.password ? {
      username: this.config.user,
      password: this.config.password
    } : undefined
  };

  // Build connection string
  let connectionString = this.config.url;
  if (!connectionString) {
    connectionString = 'mongodb://';
    
    // Add auth if provided
    if (this.config.user && this.config.password) {
      connectionString += `${encodeURIComponent(this.config.user)}:${encodeURIComponent(this.config.password)}@`;
    }
    
    // Add host and port
    connectionString += `${this.config.host}:${this.config.port}`;
    
    // Add database if provided
    if (this.config.database) {
      connectionString += `/${this.config.database}`;
    }
  }

  // Connect using MongoClient
  MongoClient.connect(connectionString, options)
    .then(client => {
      this.client = client;
      cb(null, client.db(this.config.database));
    })
    .catch(err => cb(err));
};

/**
 * Ensure Indexes
 *
 * @param {String} collection
 * @param {Array} indexes
 * @param {Function} callback
 * @api private
 */

Connection.prototype._ensureIndexes = function _ensureIndexes(collection, indexes, cb) {
  async.each(indexes, function createIndex(item, next) {
    collection.createIndex(item.index, item.options, next);
  }, cb);
};
