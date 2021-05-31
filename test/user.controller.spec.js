var chai = require('chai');
var chaiSubset = require('chai-subset');
var Promise = require('bluebird');
var _ = require('lodash');
var request = require("supertest-as-promised");
var { app, sequelize } = require('../index');

chai.use(chaiSubset);
var expect = chai.expect;

var idArr = [];
var fakeUsersData = require('./users.json');

describe('user Controller', function () {
  before(function(done) {
    setTimeout(() => done(), 2000);
  })
  it('should signup new users', function (done) {
    const users = fakeUsersData.users;
    const promiseArr = [];
    users.forEach((user) => promiseArr.push(request(app).post('/register').send(user)))
    Promise.all(promiseArr)
    .then((signedUpUsers) => {
      signedUpUsers.forEach((res, index) => {
        idArr.push(res.body.userId);
        expect(res.status).to.equal(200);
        expect(res.body).to.be.ok;
        expect(res.body).to.containSubset(_.omit(users[index], 'password'));
      })
      done();
    })
  });
  it('should not register user with the same email again', function(done) {
    const users = fakeUsersData.users;
    const promiseArr = [];
    users.forEach((user) => promiseArr.push(request(app).post('/register').send(user)))
    Promise.all(promiseArr)
    .then((responses) => {
      responses.forEach((res, index) => {
        expect(res.status).to.equal(400);
        expect(res.body.error).to.equal('User already registered');
      })
      done();
    })
  })
  it('should login existing user with email and password', function(done) {
    const users = fakeUsersData.users;
    const promiseArr = [];
    users.forEach((user) => promiseArr.push(request(app).post('/login').send(_.pick(user, ['email', 'password']))))
    Promise.all(promiseArr)
    .then((loggedInUsers) => {
      loggedInUsers.forEach((res, index) => {
        expect(res.status).to.equal(200);
        expect(res.body.userId).to.be.ok;
        expect(res.body.userName).to.equal(users[index].userName);
        expect(res.body.fullName).to.equal(users[index].fullName);
      })
      done();
    })
  });
  it('should not login non existing user', function(done) {
    const users = fakeUsersData.nonUsers;
    const promiseArr = [];
    users.forEach((user) => promiseArr.push(request(app).post('/login').send(_.pick(user, ['email', 'password']))))
    Promise.all(promiseArr)
    .then((loggedInUsers) => {
      loggedInUsers.forEach((res, index) => {
        expect(res.status).to.equal(404);
      })
      done();
    })
  });
  it('should return user with given userId', function(done) {
    const promiseArr = [];
    idArr.forEach((id) => promiseArr.push(request(app).get(`/user/${id}`)))
    Promise.all(promiseArr)
    .then((users) => {
      users.forEach((res, index) => {
        expect(res.status).to.equal(200);
        expect(res.body).to.be.ok;
        expect(res.body.userId).to.equal(idArr[index]);
      })
      done();
    })
  });
  it('should not return user if userId is wrong', function(done) {
    const id= 'fdgdffdg1232655';
    request(app).get(`/user/${id}`)
    .end((err, res) => {
         if (err) {
           expect(true).to.be.false;
         }
         expect(res.status).to.equal(404);
         done();
   });
  });
  it('should return all users', function(done) {
    request(app).get('/users/alluser')
    .end((err, res) => {
         if (err) {
           expect(true).to.be.false;
         }
         expect(res.status).to.equal(200);
         done();
   });
  });
});