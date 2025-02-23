var Adapter = require('../../lib/adapter'),
    Config = require('../support/config'),
    Fixture = require('../support/fixture'),
    assert = require('assert'),
    async = require('async');

var CONNECTIONS = 10000;

describe('Load Testing', function() {
  this.timeout(60000);

  before(function(done) {
    // Set up the connection configuration
    var connection = Config;
    connection.identity = 'test';

    // Set up the collection
    var collection = { 
      identity: 'foobar', 
      definition: Fixture 
    };
    collection.definition.connection = 'test';

    // Register connection with the collection
    Adapter.registerConnection(connection, { 'foobar': collection }, done);
  });

  describe('create with x connection', function() {
    it('should not error', function(done) {
      // Generate x users
      async.times(CONNECTIONS, function(n, next){
        var data = {
          first_name: Math.floor((Math.random()*100000)+1),
          last_name: Math.floor((Math.random()*100000)+1),
          email: Math.floor((Math.random()*100000)+1)
        };

        Adapter.create('test', 'foobar', data, next);
      }, function(err, users) {
        assert(!err);
        assert(users.length === CONNECTIONS);
        done();
      });
    });
  });

  // Clean up after tests
  after(function(done) {
    Adapter.teardown('test', done);
  });
});
