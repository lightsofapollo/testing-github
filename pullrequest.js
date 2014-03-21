var Promise = require('promise');
var Github = require('github-api');
var PromiseProxy = require('proxied-promise-object');

var uuid = require('uuid');
var debug = require('debug')('shepherd-event-sever:test:pull_request');
var assert = require('assert');

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
  head: null,

  headRepository: null,
  headUser: null,
  headBranch: null,

  /**
  Repo representation.
  See: https://github.com/michael/github#repository-api
  @type GithubAPI.Repo
  */
  base: null,

  baseRepoistory: null,
  baseUser: null,
  baseBranch: null,

  /**
  Delete branch on github.
  */
  destroy: function(callback) {
    return this.head.deleteRef('heads/' + this.headBranch);
  }
};

/**
Issue the fork and wait for the contents of the repo to be open
@param {Object} options for the fork.
@param {Object} repo repository object from the github api.
@return {Promise} promise for the forking to be completed.
*/

function forkAndWait(gh, repo) {

  function waitForShow(targetRepo) {
    var timeout = new Date();
    timeout.setSeconds(timeout.getSeconds() + 180);
    timeout = timeout.valueOf();

    return new Promise(function(accept, reject) {
      function shown() {
        if (Date.now() > timeout) {
          return reject(
            new Error('timeout while waiting for repoistory to be available')
          );
        }

        targetRepo.show().then(accept, function() {
          setTimeout(shown, 100);
        });
      }
      shown();
    });
  }

  return repo.fork().then(function(forked) {
    var forkRepo = PromiseProxy(Promise, gh.getRepo(forked.owner.login, forked.name));
    return waitForShow(forkRepo).then(function(show) {
      return [show, forkRepo];
    });
  });
}

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
  pullObject.baseRepoistory = pullObject.headRepository = pr.repo;
  pullObject.baseUser = pr.user;
  pullObject.baseBranch = pr.branch || 'master';

  pullObject.headBranch = 'branch-' + uuid();


  // create the fork
  return forkAndWait(github, baseRepo).then(function(req) {
    // destructuring someday!
    var show = req[0];
    var forkRepo = req[1];
    pullObject.head = forkRepo;
    pullObject.headUser = show.owner.login;
  }).then(function() {
    // create the branch on the forked repo
    return pullObject.head.branch(
      pullObject.baseBranch,
      pullObject.headBranch
    );
  }).then(function() {
    // create some files if given
    var promises = pr.files.map(function(file) {
      return pullObject.head.write(
        pullObject.headBranch,
        file.path,
        file.content,
        file.commit
      );
    });

    return Promise.all(promises);
  }).then(function() {
    // then send the pull request with the completed data on the forked repo
    return pullObject.base.createPullRequest({
      title: pr.title,
      body: pr.body || pr.title,
      base: pullObject.baseBranch,
      head: pullObject.headUser + ':' + pullObject.headBranch
    }).then(function(pr) {
      pullObject.data = pr;
      return pullObject;
    });
  });
}

module.exports = create;
