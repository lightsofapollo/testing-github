suite('pull_request', function() {
  this.timeout('50s');

  var createPR = require('./pullrequest');

  var auth = {};
  suiteSetup(function() {
    var envs = {
      GH_TESTING_USER: 'user',
      GH_TESTING_REPO: 'repo',
      GH_TESTING_TOKEN: 'token'
    };

    for (var env in envs) {
      assert(
        process.env[env],
        env + ' environment variable is required for tests'
      );
    }
  });

  suite('pull request with files', function() {
    var subject;
    var subjectOptions = {
      user: 'lightsofapollo',
      repo: 'testing-github',
      title: 'test pull request',
      files: [
        { commit: 'first', path: 'a.txt', content: 'woot' }
      ]
    };

    setup(function() {
      return createPR(
        process.env.GH_TESTING_TOKEN, subjectOptions
      ).then(function(pr) {
        subject = pr;
      });
    });

    teardown(function() {
      return subject.destroy().catch(function() {
        // ignore errors
      });
    });

    test('.headBranch exists', function() {
      assert.ok(subject.headBranch, 'has .branch');
      return subject.head.listBranches().then(function(list) {
        assert.ok(
          list.indexOf(subject.headBranch) !== -1,
          list.join(', ') + ' has branch ' + subject.headBranch
        );
      });
    });

    test('creates files given', function() {
      var file = subjectOptions.files[0];

      return subject.head.read(
        subject.headBranch, file.path
      ).then(function(content) {
        assert.equal(content, file.content);
      });
    });

    test('creates pull request', function() {
      return subject.base.listPulls('open').then(function(list) {
        var hasPr = list.some(function(pr) {
          var branch = pr.head.label;
          return branch.indexOf(subject.headBranch) !== -1;
        });

        assert.ok(hasPr);
      });
    });

    test('.destroy', function() {
      return subject.destroy().then(function() {
        return subject.head.listBranches();
      }).then(function(list) {
        assert.ok(
          list.indexOf(subject.headBranch) === -1,
          'removes pr'
        );
      });
    });
  });
});
