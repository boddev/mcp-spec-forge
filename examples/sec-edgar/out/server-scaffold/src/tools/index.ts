import { get_view_filer } from './get_view_filer.js';
import { list_status } from './list_status.js';
import { list_verify } from './list_verify.js';
import { create_submission_single } from './create_submission_single.js';
import { create_submission_bulk } from './create_submission_bulk.js';
import { list_submission_status } from './list_submission_status.js';
import { create_submission_status } from './create_submission_status.js';
import { list_individual } from './list_individual.js';
import { create_individual } from './create_individual.js';
import { update_individual } from './update_individual.js';
import { delete_individual } from './delete_individual.js';
import { create_ccc } from './create_ccc.js';
import { list_delegation } from './list_delegation.js';
import { create_delegation } from './create_delegation.js';

export const tools = [
  get_view_filer,
  list_status,
  list_verify,
  create_submission_single,
  create_submission_bulk,
  list_submission_status,
  create_submission_status,
  list_individual,
  create_individual,
  update_individual,
  delete_individual,
  create_ccc,
  list_delegation,
  create_delegation,
];
