import mongoose from 'mongoose'
import { Timestamp } from 'mongodb'

export default interface ChangeEventType<FDocumentType> {
  _id: {
    _data: mongoose.Types.ObjectId
  }
  operationType: string
  clusterTime: Timestamp
  fullDocument: FDocumentType
}
