// Models
export { Media } from "./models";

// Types
export type {
  MediaType,
  MediaRole,
  MediaDimensions,
  MediaMetadata,
  StoredMedia,
  CreateMediaOptions,
  UpdateMediaOptions,
  MediaFilterOptions,
  MediaOperationsContext,
} from "./types";

// Utility functions
export {
  generateMediaId,
  getMediaTypeFromMime,
  isSupportedMediaType,
} from "./types";

// Operations - CRUD
export {
  mediaToStored,
  createMediaOp,
  createMediaBatchOp,
  getMediaByIdOp,
  getMediaBySourceUrlOp,
  updateMediaOp,
  updateMediaMessageIdBatchOp,
  deleteMediaOp,
  hardDeleteMediaOp,
} from "./operations";

// Operations - Library queries
export {
  getMediaOp,
  getMediaByTypeOp,
  getImagesOp,
  getVideosOp,
  getAudioOp,
  getDocumentsOp,
  getMediaByConversationOp,
  getMediaByMessageOp,
  getMediaByIdsOp,
  getMediaByRoleOp,
  getAIGeneratedMediaOp,
  getUserUploadedMediaOp,
  getMediaByModelOp,
  getRecentMediaOp,
  searchMediaOp,
  getMediaCountOp,
  getMediaCountsByTypeOp,
  deleteMediaByConversationOp,
  deleteMediaByMessageOp,
} from "./operations";
