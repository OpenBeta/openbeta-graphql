export const Constraint = {
  NoEntitySelfReference: 'no_entity_self_reference',
  EntityNameUniqueness: 'area_name_uniqueness',
  GradeSystemNameUnique: 'grade_system_name_unique',
  GradeValueDuplicate: 'grade_value_duplicate',
  BoltCountPositive: 'bolt_count_positive',
  DuplicateGradeContext: 'duplicate_grade_context',
};

export const Trigger = {
  EntityInsert: 'entity_insert_trigger',
  EntityUpdate: 'entity_update_trigger',
  EntityDelete: 'entity_delete_trigger',
};
