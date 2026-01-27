import { AuthorMetadata } from '../../types'

export const getAuthorMetadataFromBaseNode = ({ updatedAt, updatedBy, createdAt, createdBy }: AuthorMetadata): AuthorMetadata => ({
  updatedAt,
  updatedBy,
  createdAt,
  createdBy
})
