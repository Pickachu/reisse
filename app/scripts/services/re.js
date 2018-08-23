/* globals Estimator, Classifier  */
/* exports Re */

'use strict';

/**
 * Ré - The best day
 *
 * There are three main categories of ocurrences:
 *
 *
 * • Past:
 *
 * Sensor detected or user registered ocurrences of the past are just
 * inserted into the past time of the calendar
 *
 *
 * • Future:
 *
 * A prediction set is created based on user behavior, there are two sub-categories:
 *
 * - Habitual Ocurrences: Unregistered by the user but nonetheless
 * high frequency (sleep, eat, etc) ocurrences are thought as habitual
 * ocurrences and added automatically to the prediction set, before
 * the prediction is made.
 *
 * - Predicted Ocurrences: Based on all Past and Habitual Ocurrences a prediction set
 * will be created for the given context. Ocurrences inside of a prediction set bound
 * to a context are in this category.
 *
 *
 * • Suggestions: A optimization is made from the prediction set in order to
 * generate the optimal human behavior. All ocurrences in this suggestion set
 * (also bound to the context of the original prediction set) are in this category.
 *
 * @type {stamp}
 */
Re = stampit.compose(Re.Encoder, Re.Contextualization, Re.Prediction, Re.Learning, Re.Estimation);
