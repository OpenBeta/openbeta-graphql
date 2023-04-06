import mongoose from 'mongoose'
import { MUUID } from 'uuid-mongodb'

import { ChangeRecordMetadataType } from './ChangeLogType.js'

/**
 * Organizations are OpenBeta accounts that are owned by organizations
 * instead of people. For instance, the Boulder Climbing Community might own
 * one such account. Organizations may have one or more 'org_admins' who
 * manage the account. They may update organizations' profiles and perform
 * special actions under the auspices of the organization. For example, org_admins
 * of local climbing organizations (LCO) may put up bird nesting notices on
 * the area pages associated with the LCO.
 * */
export type OrganizationType = {
  _id: mongoose.Types.ObjectId
  /**
  * All external IDs for areas are expressed as UUIDs. As such, when resolving ids at the
  * GQL layer use these values for querying and identification of organizations.
  */
  orgId: MUUID
  /**
   * Name of organization to be displayed on the site.
   */
  displayName: string
  /**
   * Type of organization. Currently we only support local climbing organizations, which
   * are associated with certain climbing areas. In future there may be advocacy groups
   * like the Access Fund or interest groups like the American Alpine Club that are not
   * associated with any specific climbing areas.
   */
  orgType: OrgType
  /**
   * Areas associated with this organization. This has a strong relation to the
   * areas collection, and contains only direct child areas - rather than all descendents.
   */
  associatedAreaIds: MUUID[]
  /**
   * Areas the organization explicitly does not want to be associated with.
   * Takes precedence over associatedAreas. Intended use is for organizations to associate
   * with large swathes of areas, and then exclude a few specific ones that are contentious
   * or legally problematic. In other words, excludedAreas *unlike associatedAreas* have to be
   * specified individually -- an area is not automatically excluded just because an ancestor is.
   */
  excludedAreaIds: MUUID[]
  /**
   * User-composed content that makes up most of the user-readable data in the system.
   * See the IOrganizationContent documentation for more information.
   **/
  content: IOrganizationContent
  /**
   * If this organization has been edited, this field will contain the metadata about the
   * last edit that was made.
   */
  _change?: ChangeRecordMetadataType
  /** Used to delete an area.  See https://www.mongodb.com/docs/manual/core/index-ttl/ */
  _deleting?: Date
  createdAt?: Date
  updatedAt?: Date
  updatedBy?: MUUID
  createdBy?: MUUID
}

export interface IOrganizationContent {
  /**
   * URL of organization's website.
   */
  website?: string
  /**
   * Organization's email address.
   */
  email?: string
  /**
   * URL of organization's donation link.
   */
  donationLink?: string
  /**
   * URL of organization's Instagram page.
   */
  instagramLink?: string
  /** longform to mediumform description of this organization.
   *
   * We expect org_admins to make a call about whatever kind of context may be appropriate
   * for this entity, and may be pretty short to extremely detailed.
   */
  description?: string
}

/** Fields that may be directly modified by org_admins.
 */
export interface OrganizationEditableFieldsType {
  associatedAreaIds?: MUUID[]
  excludedAreaIds?: MUUID[]
  displayName?: string
  website?: string
  email?: string
  donationLink?: string
  instagramLink?: string
  description?: string
}

export enum OrgType {
  localClimbingOrganization='LOCAL_CLIMBING_ORGANIZATION'
}

/** The audit trail comprises a set of controlled events that may occur in relation
 * to user actiion on core data. The enumeration herein defines the set of events
 * that may occur, and short documentation of what they mean
 */
export enum OperationType {
  /**
   * This event signals that an organization should be deleted. These signals can be reversed,
   * organizations can be un-deleted.
   */
  deleteOrganization = 'deleteOrganization',
  addOrganization = 'addOrganization',
  updateOrganization = 'updateOrganization',
}
