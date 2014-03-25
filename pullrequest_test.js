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
        { commit: 'first', path: 'newdata.txt', content: 'icreatethings' }
      ]
    };

    setup(function() {
      return createPR(
        process.env.GH_TESTING_TOKEN, subjectOptions
      ).then(function(pr) {
        subject = pr;
      }).catch(function(err) {
        console.log('EPIC FAILS', err);
      });
    });

    teardown(function() {
      return subject.destroy().catch(function() {
        // ignore errors
      });
    });

    test('.forkBranch exists', function() {
      assert.ok(subject.forkBranch, 'has .branch');
      return subject.fork.listBranches().then(function(list) {
        assert.ok(
          list.indexOf(subject.forkBranch) !== -1,
          list.join(', ') + ' has branch ' + subject.forkBranch
        );
      });
    });

    test('creates files given', function() {
      var file = subjectOptions.files[0];

      return subject.fork.read(
        subject.forkBranch, file.path
      ).then(function(content) {
        assert.equal(content, file.content);
      });
    });

    test('creates pull request', function() {
      return subject.fork.listPulls('open').then(function(list) {
        var hasPr = list.some(function(pr) {
          var branch = pr.head.label;
          console.log(branch, subject.forkBranch);
          return branch.indexOf(subject.forkBranch) !== -1;
        });

        assert.ok(hasPr);
      });
    });

    test('.destroy', function() {
      return subject.destroy().then(function() {
        return subject.fork.listBranches();
      }).then(function(list) {
        assert.ok(
          list.indexOf(subject.forkBranch) === -1,
          'removes pr'
        );
      });
    });
  });
});
