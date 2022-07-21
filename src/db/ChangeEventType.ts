import mongoose from 'mongoose'
import { ChangeStreamNameSpace, Timestamp } from 'mongodb'

export default interface ChangeEventType<FDocumentType> {
  _id: {
    _data: mongoose.Types.ObjectId
  }
  operationType: string
  clusterTime: Timestamp
  ns: ChangeStreamNameSpace
  documentKey: Object
  fullDocument: FDocumentType
}
