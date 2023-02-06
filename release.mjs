// Adapted from https://github.com/coveo/semantic-monorepo-tools/blob/main/scripts/release.mjs
import {
  getLastTag,
  parseCommits,
  getCommits,
  getCurrentVersion,
  getNextVersion,
  npmBumpVersion,
  generateChangelog,
  writeChangelog,
  gitPushTags,
  gitTag,
  gitSetupUser,
  npmPublish,
  gitCreateBranch,
  gitCheckoutBranch,
  gitAdd,
  getCurrentBranchName,
  getSHA1fromRef,
  gitWriteTree,
  gitCommitTree,
  gitUpdateRef,
  gitPublishBranch,
  gitSetRefOnCommit,
  gitPush,
  gitDeleteRemoteBranch,
} from '@coveo/semantic-monorepo-tools';
import angularChangelogConvention from 'conventional-changelog-angular';
import {Octokit} from 'octokit';
import {createActionAuth} from '@octokit/auth-action';

// Get all commits since last release bump the root package.json version.
(async () => {
  //#region Constants
  const PATH = '.';
  const VERSION_PREFIX = 'v';
  const CONVENTION = await angularChangelogConvention;
  const REPO_OWNER = 'coveo';
  const REPO_NAME = 'push-api-client.js';
  const GIT_USERNAME = 'github-actions';
  const GIT_EMAIL = 'github-actions@github.com';
  //#endregion

  // #region Setup Git
  await gitSetupUser(GIT_USERNAME, GIT_EMAIL);
  //#endregion

  //#region GitHub authentication
  const octokit = new Octokit({
    authStrategy: createActionAuth,
  });
  //#endregion

  //#region Find current and new versions
  const lastTag = await getLastTag(VERSION_PREFIX);
  // Passing an empty string allow empty commits (i.e. that does not modify any files) to be included.
  const commits = await getCommits('', lastTag);
  const parsedCommits = parseCommits(commits, CONVENTION.parserOpts);
  const bumpInfo = CONVENTION.recommendedBumpOpts.whatBump(parsedCommits);
  const currentVersion = getCurrentVersion(PATH);
  const newVersion = getNextVersion(currentVersion, bumpInfo);
  const newVersionTag = `${VERSION_PREFIX}${newVersion}`;
  //#endregion

  // Bump the NPM version.
  await npmBumpVersion(newVersion, PATH);

  //#region Generate changelog if needed
  let changelog = '';
  if (parsedCommits.length > 0) {
    changelog = await generateChangelog(
      parsedCommits,
      newVersion,
      {
        host: 'https://github.com',
        owner: REPO_OWNER,
        repository: REPO_NAME,
        linkReferences: true,
        currentTag: newVersionTag,
        previousTag: lastTag,
      },
      CONVENTION.writerOpts
    );
    await writeChangelog(PATH, changelog);
  }
  //#endregion

  //#region Commit changelog, tag version and push
  const tempBranchName = `release/${newVersion}`;
  const mainBranchName = await getCurrentBranchName();
  const mainBranchCurrentSHA = await getSHA1fromRef(mainBranchName);

  // Create a temporary branch and check it out.
  await gitCreateBranch(tempBranchName);
  await gitCheckoutBranch(tempBranchName);
  // Stage all the changes (mainly the changelog)...
  await gitAdd('.');

  //... and create a Git tree object with the changes).
  const treeSHA = await gitWriteTree();
  // Create a new commit that references the Git tree object.
  const commitTree = await gitCommitTree(treeSHA, tempBranchName, 'tempcommit');

  // Update the HEAD of the temp branch to point to the new commit, then publish the temp branch.
  await gitUpdateRef('HEAD', commitTree);
  await gitPublishBranch('origin', tempBranchName);

  /**
   * Once we pushed the temp branch, the tree object is then known to the remote repository.
   * We can now create a new commit that references the tree object using the GitHub API.
   * The fact that we use the API makes the commit 'verified'.
   * The commit is directly created on the GitHub repository, not on the local repository.
   */
  const commit = await octokit.rest.git.createCommit({
    message: `chore(release): ${newVersion} [skip ci]`,
    owner: REPO_OWNER,
    repo: REPO_NAME,
    tree: treeSHA,
    parents: [mainBranchCurrentSHA],
  });
  // Forcefully reset `main` to the commit we just created with the GitHub API.
  await gitSetRefOnCommit(
    'origin',
    `refs/heads/${mainBranchName}`,
    commit.data.sha
  );

  // Push the branch using the SSH remote to bypass any GitHub checks.
  await gitCheckoutBranch(mainBranchName);
  await gitPush('origin', mainBranchName);
  // Finally, delete the temp branch.
  await gitDeleteRemoteBranch('origin', tempBranchName);
  //#endregion

  //#region Create & push tag
  await gitTag(newVersionTag);
  await gitPushTags();
  //#endregion

  // Publish the new version on NPM
  await npmPublish(PATH);

  //#region Create GitHub Release on last tag
  const [, ...bodyArray] = changelog.split('\n');
  await octokit.rest.repos.createRelease({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    tag_name: newVersionTag,
    name: `Release ${newVersionTag}`,
    body: bodyArray.join('\n'),
  });
  //#endregion
})();
