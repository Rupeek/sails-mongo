
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
  // Base connection options that apply to both Atlas and standard MongoDB
  const baseOptions = {
    maxPoolSize: this.config.maxPoolSize || 10,
    minPoolSize: this.config.minPoolSize || 0,
    connectTimeoutMS: this.config.connectTimeoutMS || 30000,
    socketTimeoutMS: this.config.socketTimeoutMS || 360000,

    writeConcern: this.config.writeConcern || { w: 1 },
    readPreference: this.config.readPreference || 'primary'
  };

  let connectionString;
  let options;

  if (this.config.atlas) {
    // Atlas-specific configuration
    options = {
      ...baseOptions,
      tls: true,
      retryWrites: true,
      retryReads: true,
      useNewUrlParser: true,
      useUnifiedTopology: true
    };

    // Build Atlas connection string
    connectionString = this.config.url;
    if (!connectionString) {
      connectionString = 'mongodb+srv://';
      if (this.config.user && this.config.password) {
        connectionString += `${encodeURIComponent(this.config.user)}:${encodeURIComponent(this.config.password)}@`;
      }
      connectionString += this.config.host;
      if (this.config.database) {
        connectionString += `/${this.config.database}`;
      }
      connectionString += '?retryWrites=true&w=majority';
    }
  } else {
    // Standard MongoDB configuration
    options = {
      ...baseOptions
    };

    // Build standard connection string
    connectionString = this.config.url;
    if (!connectionString) {
      connectionString = 'mongodb://';
      if (this.config.user && this.config.password) {
        connectionString += `${encodeURIComponent(this.config.user)}:${encodeURIComponent(this.config.password)}@`;
      }
      connectionString += `${this.config.host}:${this.config.port}`;
      if (this.config.database) {
        connectionString += `/${this.config.database}`;
      }
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
