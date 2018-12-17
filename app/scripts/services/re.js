/* globals Estimator, Classifier  */
/* exports Re */

'use strict';

/**
 * Ré - The best day
 *
 * Conceptually, there are three main sets of occurrences:
 *
 *
 * • The learning set:
 *
 * This occurrences are collected externally. Usually they are collected by sensors
 * or user input (in another software, we use only their apis).
 *
 * - Past occurrences: Sensor detected or user registered occurrences of the past are just
 * inserted into the past time of the calendar
 *
 * - Desired occurrences: Potential future occurrences, usually a desired future by
 * the user or some application the user uses. (ex: a task from a producitivity
 * app (asana, things) with or without due date)
 *
 * - Present occurrences: Ocurrences are happening right now. There is no
 * treatment for the present in the software currently. Perhaps a streaming API?
 *
 *
 * • The prediction set:
 *
 * Given the context and a selection pool the prediction set is a subset of the
 * selection pool sorted by chance of ocurring (aka probability).
 *
 * It is created based on:
 *  - a given context
 *  - a selection pool:
 *    - probable desired ocurrences
 *    - the habitual ocurrences subset
 *
 * - Context: Since a context have a timestamp, the prediction set can be
 * in the future, present or past. But always bound by a timestamp (a frame in
 * time, if you will)
 *
 * - Selection Pool:
 *
 *   - Predictable occurrences: present and past occurrences.
 *
 *   - Habitual occurrences subset: Based only on past behavioral ocurrences
 *   a habituality model is generated and use to create habitual ocurrences.
 *   (Usually this is data unregistered by the user but nonetheless high
 *   frequency (sleep, eat, etc) occurrences are thought as habitual)
 *
 *
 * • The suggested set:
 *
 * The suggested set is a optimization made from the prediction set in order to
 * generate the optimal human behavior. All occurrences in the suggestion set
 * (also bound to the context of the original prediction set) are in this category.
 *
 * - Optmized occurrences: Since each suggester have access to the whole
 * prediction set, each suggester will have the capacity to alter the prediction
 * set in any manner. Given this, there is essentially one sub-category for each
 * suggester.
 *
 * @type {stamp}
 */
Re = stampit.compose(Re.Encoder, Re.Contextualization, Re.Prediction, Re.Learning, Re.Estimation);
