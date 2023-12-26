const chaiHttp = require('chai-http');
const chai = require('chai');
let assert = chai.assert;
let expect = chai.expect;
const server = require('../server.js');

chai.use(chaiHttp);

suite('Functional Tests', function() {
  suite('API ROUTING FOR /api/threads/:board', function() {
    let id;
    suite('POST', function() {
      test('Test POST request for /api/threads/:board', function(done) {
        chai.request(server)
         .post('/api/threads/:board')
         .send({
          board: 'test_board',
          text: 'Board test text',
          delete_password: '12345'
         })
         .end(function(err, res){
          assert.equal(res.status,200);
          expect(res).to.redirect;

          let indexId = res.redirects[0].indexOf("?_id");
          id = res.redirects[0].slice(indexId + 5, res.redirects[0].length);
          done();
         })
      });
      test('Empty body POST test for /api/threads/:board', function(done) {
        chai.request(server)
         .post('/api/threads/test_board')
         .send({})
         .end(function(err, res){
          assert.equal(res.status, 200);
          assert.equal(res.text, "Couldn't post new thread");
          done();
         });
      });
    });

    suite('GET', function() {
      test('Test GET /api/threads/:board', function(done) {
        chai.request(server)
         .get('/api/threads/test_board')
         .end(function(err, res) {
          assert.equal(res.status, 200);
          assert.isArray(res.body);
          assert.isArray(res.body[0].replies);
          assert.property(res.body[0], 'text');
          assert.property(res.body[0], 'created_on');
          assert.property(res.body[0], 'bumped_on');
          assert.property(res.body[0], 'replies');
          assert.property(res.body[0], 'replycount');
          assert.isUndefined(res.body[0].reported);
          assert.isUndefined(res.body[0].password);
          done();
         });
      });
    });

    suite('PUT', function() {
      test('Test PUT /api/threads/:board', function(done) {
        chai.request(server)
         .put('/api/threads/test_board')
         .send({ board: 'test_board', report_id : id })
         .end(function(err, res) {
          assert.equal(res.status, 200);
          assert.equal(res.text, 'Report successful');
          done();
         });
      });
      test('Test PUT r/api/threads/:board with empty body', function(done) {
        chai.request(server)
         .put('/api/threads/test_board')
         .send({})
         .end(function(err, res) {
          assert.equal(res.status, 200);
          assert.equal(res.text, "Couldn't report the thread");
          done();
         });
      });
    });

    suite('DELETE', function() {
      test('Test DELETE /api/threads/:board', function(done) {
        chai.request(server)
          .delete('/api/threads/test_board')
          .send({ board: 'test_board', thread_id: id, delete_password: 'chai'})
          .end(function(err, res) {
            assert.equal(res.status, 200);
            assert.equal(res.text, 'Delete successfull.');
            done();
          });
      });
      test('Test DELETE with empty body /api/threads/:board', function(done) {
        chai.request(server)
          .delete('/api/threads/test_board')
          .send({})
          .end(function(err, res) {
            assert.equal(res.status, 200);
            assert.equal(res.text, 'Incorrect password.');
            done();
          });
      });
    });
  });
  suite('API ROUTING for /api/replies/:board', function() {
    let reply_id;

    suite('POST', function() {
      test('Test POST for /api/replies/:board', function(done) {
        chai.request(server)
         .post('/api/replies/test_board')
         .send({
          board: 'test_board',
          thread_id: '5c886d1f59e916076c31bc19',
          text: 'Test reply text',
          delete_password: '12345'
         })
         .end(function(err, res) {
          assert.equal(res.status, 200);
          let isValidRedirect = /\/b\/test_board\//.test(res.redirects[0]);
          assert.equal(isValidRedirect, true);
          done();
         });
      });
      test('Empty body test POST /api/replies/:board', function(done) {
        chai.request(server)
          .post('/api/replies/test_board')
          .send({})
          .end(function(err, res) {
            assert.equal(res.status, 200);
            assert.equal(res.text, "Couldn't reply to the thread.");
            done();
          });
      });
    });
    suite('GET', function() {
      test('Test GET /api/replies/:board', function(done) {
        chai.request(server)
          .get('/api/replies/test_board')
          .query({ thread_id: '5c886d1f59e916076c31bc19' })
          .end(function(err, res) {
            assert.equal(res.status, 200);
            assert.isArray(res.body.replies);
            assert.property(res.body.replies[0], 'text');
            assert.property(res.body.replies[0], 'created_on');
            assert.isUndefined(res.body.replies[0].reported);
            assert.isUndefined(res.body.replies[0].password);
            reply_id = res.body.replies[0]._id;
            done();
          });
      });
      test('Test GET with empty query /api/replies/:board', function(done) {
        chai.request(server)
          .get('/api/replies/test_board')
          .query({})
          .end(function(err, res) {
            assert.equal(res.status, 200);
            assert.equal(res.text, "Error while retrieving data.");
            done();
          });
      });
    });
    suite('PUT', function() {
      test('Test PUT /api/replies/:board', function(done) {
        chai.request(server)
          .put('/api/replies/test_board')
          .send({ board: 'test_board', reply_id: reply_id })
          .end(function(err, res) {
            assert.equal(res.status, 200);
            assert.equal(res.text, 'Report successful.');
            done();
          });
      });
      test('Test PUT with empty body /api/replies/:board', function(done) {
        chai.request(server)
          .put('/api/replies/test_board')
          .send({})
          .end(function(err, res) {
            assert.equal(res.status, 200);
            assert.equal(res.text, "Couldn't report the reply.");
            done();
          });
      });
    });
    
    suite('DELETE', function() {
      test('Test DELETE /api/replies/:board', function(done) {
        chai.request(server)
          .delete('/api/replies/test_board')
          .send({ board: 'test_board', thread_id: '5c886d1f59e916076c31bc19', reply_id: reply_id, delete_password: '12345'})
          .end(function(err, res) {
            assert.equal(res.status, 200);
            assert.equal(res.text, 'Delete successfull.');
            done();
          });
      });
      test('Test DELETE with empty body /api/replies/:board', function(done) {
        chai.request(server)
          .delete('/api/replies/test_board')
          .send({})
          .end(function(err, res) {
            assert.equal(res.status, 200);
            assert.equal(res.text, 'Incorrect password.');
            done();
          });
      });
    });
  })
})

