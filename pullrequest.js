var Promise = require('promise');
var Github = require('github-api');

var uuid = require('uuid');
var debug = require('debug')('shepherd-event-sever:test:pull_request');
var assert = require('assert');

/**
Github object representation.
*/
function PullRequest() {}

PullRequest.prototype = {
  /**
  branch where pull request comes from.
  @type String
  */
  branch: null,

  /**
  Repo representation.
  See: https://github.com/michael/github#repository-api
  @type GithubAPI.Repo
  */
  repo: null,

  sourceRepoBranches: function() {
    var list = Promise.denodeify(this.repo.listBranches.bind(this.repo));
    return list();
  },

  /**
  Delete branch on github.
  */
  destroy: function(callback) {
    var deleteRef = Promise.denodeify(this.repo.deleteRef.bind(this.repo));
    return deleteRef('heads/' + this.branch);
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

@param {Object} auth authorization details for the github account.
@param {Object} auth.repo repository on github.
@param {Object} auth.user user on github.
@param {Object} auth.token github token.
@param {Object} pr options for the pull request.
@param {Array[Object]} pr.files files in the pull request.
@param {String} [pr.branch=master] target branch for the pull request.
@param {String} pr.title for pull request.
*/
function create(auth, pr) {
  assert(pr.files, 'pr.files is given');
  assert(Array.isArray(pr.files), 'pr.files is an array');
  assert(auth.repo, 'auth.repo is given');
  assert(auth.user, 'auth.user is given');
  assert(auth.token, 'auth.token is given');

  debug('create pr', pr);

  var github = new Github({ token: auth.token });

  // repo where we put test subjects.
  var junkyard = github.getRepo(auth.user, auth.repo);

  // create the branch name
  var pullObject = new PullRequest();

  pullObject.branch = 'branch-' + uuid();
  pullObject.repo = junkyard;

  function createFiles() {
    var write = Promise.denodeify(junkyard.write.bind(junkyard));

    var promises = pr.files.map(function(file) {
      return write(pullObject.branch, file.path, file.content, file.commit);
    });

    return Promise.all(promises);
  }

  function createPullRequest() {
    var createPr = Promise.denodeify(
      junkyard.createPullRequest.bind(junkyard)
    );

    return createPr({
      title: pr.title,
      body: pr.title,
      base: pr.branch || 'master',
      head: pullObject.branch
    }).then(function(pr) {
      pullObject.initial = pr;
      return pullObject;
    });
  }

  var createBranch = Promise.denodeify(junkyard.branch.bind(junkyard));

  return createBranch('master', pullObject.branch).
    then(createFiles).
    then(createPullRequest);
}

module.exports = create;
