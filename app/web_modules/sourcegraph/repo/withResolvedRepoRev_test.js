// @flow weak

import React from "react";
import expect from "expect.js";
import withResolvedRepoRev from "sourcegraph/repo/withResolvedRepoRev";
import {render} from "sourcegraph/util/renderTestUtils";
import RepoStore from "sourcegraph/repo/RepoStore";
import * as RepoActions from "sourcegraph/repo/RepoActions";

const C = withResolvedRepoRev((props) => null);

describe("withResolvedRepoRev", () => {
	it("should have no error initially", () => {
		render(<C params={{splat: "r"}} />);
	});

	it("should have no error if the repo and rev exist", () => {
		RepoStore.directDispatch(new RepoActions.FetchedRepo("r", {DefaultBranch: "v"}));
		render(<C params={{splat: "r"}} />);
	});

	it("should be HTTP 202 if the repo is cloning", () => {
		RepoStore.directDispatch(new RepoActions.FetchedRepo("r", {DefaultBranch: "v"}));
		RepoStore.directDispatch(new RepoActions.RepoCloning("r", true));
		render(<C params={{splat: "r"}} />);
	});

	it("should have error if the repo does not exist", () => {
		RepoStore.directDispatch(new RepoActions.FetchedRepo("r", {Error: true}));
		render(<C params={{splat: "r"}} />);
	});

	describe("repo resolution", () => {
		it("should NOT initially trigger WantResolveRepo (the route onEnter/onChange does it)", () => {
			const res = render(<C params={{splat: "r"}} />, {router: {}});
			expect(res.actions).to.eql([]);
		});
		it("should trigger WantRepo for resolved local repos", () => {
			RepoStore.directDispatch(new RepoActions.RepoResolved("r", {Result: {Repo: {URI: "r"}}}));
			let calledReplace = false;
			const res = render(<C params={{splat: "r"}} />, {
				router: {replace: () => calledReplace = true},
			});
			expect(calledReplace).to.be(false);
			expect(res.actions).to.eql([new RepoActions.WantRepo("r")]);
		});
		it("should NOT trigger WantRepo for resolved remote repos", () => {
			RepoStore.directDispatch(new RepoActions.RepoResolved("github.com/user/repo", {Result: {RemoteRepo: {Owner: "user", Name: "repo"}}}));
			let calledReplace = false;
			const res = render(<C params={{splat: "github.com/user/repo"}} />, {
				router: {replace: () => calledReplace = true},
			});
			expect(calledReplace).to.be(false);
			expect(res.actions).to.eql([]);
		});

		it("should redirect for resolved local repos with different canonical name", () => {
			RepoStore.directDispatch(new RepoActions.RepoResolved("repo", {Result: {Repo: {URI: "renamedRepo"}}}));
			let calledReplace = false;
			render(<C params={{splat: "repo"}} />, {
				router: {replace: () => calledReplace = true},
			});
			expect(calledReplace).to.be(true);
		});
		it("should redirect for resolved remote repos with different canonical name", () => {
			RepoStore.directDispatch(new RepoActions.RepoResolved("github.com/user/repo", {Result: {RemoteRepo: {Owner: "renamedUser", Name: "renamedRepo"}}}));
			let calledReplace = false;
			render(<C params={{splat: "github.com/user/repo"}} />, {
				router: {replace: () => calledReplace = true},
			});
			expect(calledReplace).to.be(true);
		});
	});
});
