import URI from "vs/base/common/uri";
import { TPromise } from "vs/base/common/winjs.base";
import { RawText } from "vs/editor/common/model/textModel";
import { IModelService } from "vs/editor/common/services/modelService";
import { IFileService, IResolveContentOptions } from "vs/platform/files/common/files";
import { ConfirmResult } from "vs/workbench/common/editor";
import { TextFileService } from "vs/workbench/services/textfile/browser/textFileService";
import { IRawTextContent, IResult, ISaveOptions, ITextFileEditorModel, ITextFileEditorModelManager, ITextFileOperationResult, SaveReason } from "vs/workbench/services/textfile/common/textfiles";

import { IConfigurationService } from "vs/platform/configuration/common/configuration";
import { ILifecycleService } from "vs/platform/lifecycle/common/lifecycle";
import { ITelemetryService } from "vs/platform/telemetry/common/telemetry";
import { IWorkspaceContextService } from "vs/platform/workspace/common/workspace";
import { IBackupModelService } from "vs/workbench/services/backup/common/backup";
import { IWorkbenchEditorService } from "vs/workbench/services/editor/common/editorService";
import { IUntitledEditorService } from "vs/workbench/services/untitled/common/untitledEditorService";

import { IInstantiationService } from "vs/platform/instantiation/common/instantiation";
import { IMessageService } from "vs/platform/message/common/message";
import { IWindowsService } from "vs/platform/windows/common/windows";
import { IBackupFileService } from "vs/workbench/services/backup/common/backup";
import { IEditorGroupService } from "vs/workbench/services/group/common/groupService";

import { Services } from "sourcegraph/workbench/services";

export class GitTextFileService extends TextFileService {
	public models: ITextFileEditorModelManager;

	constructor(
		@ILifecycleService lifecycleService: ILifecycleService,
		@IWorkspaceContextService contextService: IWorkspaceContextService,
		@IConfigurationService configurationService: IConfigurationService,
		@ITelemetryService telemetryService: ITelemetryService,
		@IWorkbenchEditorService editorService: IWorkbenchEditorService,
		@IFileService fileService: IFileService,
		@IUntitledEditorService untitledEditorService: IUntitledEditorService,
		@IInstantiationService instantiationService: IInstantiationService,
		@IMessageService messageService: IMessageService,
		@IBackupFileService backupFileService: IBackupFileService,
		@IWindowsService windowsService: IWindowsService,
		@IEditorGroupService editorGroupService: IEditorGroupService,
		@IBackupModelService backupModelService: IBackupModelService,
	) {
		super(lifecycleService, contextService, configurationService, telemetryService, editorGroupService, fileService, untitledEditorService, instantiationService, backupModelService, messageService);
	}

	public resolveTextContent(resource: URI, options?: IResolveContentOptions): TPromise<IRawTextContent> {
		return this.fileService.resolveContent(resource, options).then(content => {
			const modelService = Services.get(IModelService);
			return {
				...content,
				value: RawText.fromString(content.value || "", modelService.getCreationOptions()),
				valueLogicalHash: Math.random().toString(), // TODO(sqs)
				encoding: content.encoding,
			};
		});
	}

	public promptForPath(defaultPath?: string): string {
		throw new Error("not implemented");
	}

	public confirmSave(resources?: URI[]): ConfirmResult {
		return ConfirmResult.DONT_SAVE;
	}

	public save(resource: URI, options?: ISaveOptions): TPromise<boolean> {
		return this.saveAll([resource]).then(result => result.results.length === 1 && result.results[0].success);
	}

	public saveAll(arg1?: any, reason?: SaveReason): TPromise<ITextFileOperationResult> {
		const dirtyFileModels = this._getDirtyFileModels(Array.isArray(arg1) ? arg1 : void 0 /* Save All */);

		const mapResourceToResult: { [resource: string]: IResult } = Object.create(null);
		dirtyFileModels.forEach(m => {
			mapResourceToResult[m.getResource().toString()] = {
				source: m.getResource()
			};
		});

		return TPromise.join(dirtyFileModels.map(model => {
			return model.save({ reason }).then(() => {
				if (!model.isDirty()) {
					mapResourceToResult[model.getResource().toString()].success = true;
				}
			});
		})).then(r => {
			return {
				results: Object.keys(mapResourceToResult).map(k => mapResourceToResult[k])
			};
		});
	}

	private _getFileModels(resources?: URI[]): ITextFileEditorModel[];
	private _getFileModels(resource?: URI): ITextFileEditorModel[];
	private _getFileModels(arg1?: any): ITextFileEditorModel[] {
		if (Array.isArray(arg1)) {
			const models: ITextFileEditorModel[] = [];
			(arg1 as URI[]).forEach(resource => {
				models.push(...this._getFileModels(resource));
			});

			return models;
		}

		return this.models.getAll(arg1 as URI);
	}

	private _getDirtyFileModels(resources?: URI[]): ITextFileEditorModel[];
	private _getDirtyFileModels(resource?: URI): ITextFileEditorModel[];
	private _getDirtyFileModels(arg1?: any): ITextFileEditorModel[] {
		return this._getFileModels(arg1).filter(model => model.isDirty());
	}

	public saveAs(resource: URI, target?: URI): TPromise<URI> {
		throw new Error("not implemented");
	}

	public revert(resource: URI, force?: boolean): TPromise<boolean> {
		return this.revertAll([resource], force).then(result => result.results.length === 1 && result.results[0].success);
	}
}
