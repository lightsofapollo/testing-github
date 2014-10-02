var Promise = require('promise');
var Github = require('github-api');
var PromiseProxy = require('proxied-promise-object');

var uuid = require('uuid');
var debug = require('debug')('shepherd-event-sever:test:pull_request');
var assert = require('assert');
var fork = require('./fork');

/**
Github object representation.
*/
function PullRequest() {}

PullRequest.prototype = {
  /**
  Response of the initial pull request.
  */
  data: null,

  /**
  Repo representation.
  Repository object representing the `head`
  @see: https://github.com/michael/github#repository-api
  @type GithubAPI.Repo
  */
  fork: null,

  // Branch where we originally created the fork from...
  startingBranch: null,
  forkRepository: null,
  forkBranch: null,

  /**
  Repo representation.
  See: https://github.com/michael/github#repository-api
  @type GithubAPI.Repo
  */
  base: null,

  baseRepoistory: null,
  baseBranch: null,

  /**
  Delete branch on github.
  */
  destroy: function(callback) {
    return this.fork.deleteRef('heads/' + this.forkBranch);
  }
};

/**
create a pull request over the github api and create the abstract object.

    create({
      title: 'magic pull request +shepherd',
      files: [
        { commit: 'xfoo', path: 'path.js', content: 'wow!' }
      ]
    }).then(pr)
      // do stuff with pr
    });

@param {String} token github oauth token for authentication.
@param {Object} pr options for the pull request.
@param {String} pr.user username of the repository to fork.
@param {String} pr.repo base repository to create pull request to.
@param {Array[Object]} pr.files files in the pull request.
@param {String} [pr.branch=master] target branch for the pull request.
@param {String} pr.title for pull request.
*/
function create(token, pr) {
  assert(pr.user, 'has base user (pr.user)');
  assert(pr.repo, 'has base repo (pr.repo)');
  assert(pr.files, 'pr.files is given');
  assert(Array.isArray(pr.files), 'pr.files is an array');

  debug('create pr', pr);

  // github api interface
  var github = new Github({ token: token });

  // reference to the _base_ repository
  var baseRepo = PromiseProxy(Promise, github.getRepo(pr.user, pr.repo));

  // create the reference object and set it's branch
  var pullObject = new PullRequest();
  pullObject.base = baseRepo;
  pullObject.baseRepoistory = pullObject.forkRepository = pr.repo;
  pullObject.startingBranch = pr.branch || 'master';
  pullObject.baseBranch = pr.baseBranch || pullObject.startingBranch;

  pullObject.forkBranch = 'branch-' + uuid();

  return fork(github, pr.user, pr.repo).then(function(forkRepo) {
    // destructuring someday!
    pullObject.fork = forkRepo;
  }).then(function() {
    debug('forking branch ', pullObject.forkBranch, pullObject.baseBranch);
    // create the branch on the forked repo
    return pullObject.fork.branch(
      pullObject.startingBranch,
      pullObject.forkBranch
    );
  }).then(function() {
    // create some files if given
    var promises = pr.files.map(function(file) {
      return pullObject.fork.write(
        pullObject.forkBranch,
        file.path,
        file.content,
        file.commit
      );
    });

    return Promise.all(promises);
  }).then(function() {
    // then send the pull request with the completed data on the forked repo
    return pullObject.fork.createPullRequest({
      title: pr.title,
      body: pr.body || pr.title,
      base: pullObject.baseBranch,
      head: pullObject.forkBranch
    }).then(function(pr) {
      pullObject.data = pr;
      return pullObject;
    });
  });
}

module.exports = create;
