import { summarize_patient } from './summarize_patient.js';
import { find_observation } from './find_observation.js';
import { find_condition } from './find_condition.js';
import { get_medication } from './get_medication.js';
import { summarize_encounter } from './summarize_encounter.js';
import { get_allergyintolerance } from './get_allergyintolerance.js';
import { find_immunization } from './find_immunization.js';
import { find_careteam } from './find_careteam.js';
import { find_diagnosticreport } from './find_diagnosticreport.js';

export const tools = [
  summarize_patient,
  find_observation,
  find_condition,
  get_medication,
  summarize_encounter,
  get_allergyintolerance,
  find_immunization,
  find_careteam,
  find_diagnosticreport,
];
