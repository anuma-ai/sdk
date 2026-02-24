// Models
export { Media } from "./models";

// Types
export type {
  CreateMediaOptions,
  MediaDimensions,
  MediaFilterOptions,
  MediaMetadata,
  MediaOperationsContext,
  MediaRole,
  MediaType,
  StoredMedia,
  UpdateMediaOptions,
} from "./types";

// Utility functions
export { generateMediaId, getMediaTypeFromMime, isSupportedMediaType } from "./types";

// Operations - CRUD
export {
  createMediaBatchOp,
  createMediaOp,
  deleteMediaOp,
  getMediaByIdOp,
  getMediaBySourceUrlOp,
  hardDeleteMediaOp,
  mediaToStored,
  updateMediaMessageIdBatchOp,
  updateMediaOp,
} from "./operations";

// Operations - Library queries
export {
  deleteMediaByConversationOp,
  deleteMediaByMessageOp,
  getAIGeneratedMediaOp,
  getAudioOp,
  getDocumentsOp,
  getImagesOp,
  getMediaByConversationOp,
  getMediaByIdsOp,
  getMediaByMessageOp,
  getMediaByModelOp,
  getMediaByRoleOp,
  getMediaByTypeOp,
  getMediaCountOp,
  getMediaCountsByTypeOp,
  getMediaOp,
  getRecentMediaOp,
  getUserUploadedMediaOp,
  getVideosOp,
  searchMediaOp,
} from "./operations";
