import BlobStore from "sourcegraph/blob/BlobStore";
import DefStore from "sourcegraph/def/DefStore";
import RepoStore from "sourcegraph/repo/RepoStore";
import TreeStore from "sourcegraph/tree/TreeStore";
import SearchStore from "sourcegraph/search/SearchStore";
import DashboardStore from "sourcegraph/dashboard/DashboardStore";
import BuildStore from "sourcegraph/build/BuildStore";
import UserStore from "sourcegraph/user/UserStore";

// resetStores resets all stores with the provided data. If null is provided,
// then the stories are cleared.
export default function resetStores(data) {
	RepoStore.reset(data ? data.RepoStore : null);
	BlobStore.reset(data ? data.BlobStore : null);
	DefStore.reset(data ? data.DefStore : null);
	TreeStore.reset(data ? data.TreeStore : null);
	SearchStore.reset(data ? data.SearchStore : null);
	DashboardStore.reset(data ? data.DashboardStore : null);
	BuildStore.reset(data ? data.BuildStore : null);
	UserStore.reset(data ? data.UserStore : null);
}
