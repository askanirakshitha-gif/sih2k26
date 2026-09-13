/**
 * Adaptive Clinical Question Engine
 * Deterministic sequencing based on question ontology, parent dependencies, and sequence order.
 */

const { db } = require('./db');

class QuestionEngine {
  /**
   * Determine the next question to present to the kiosk patient.
   * @param {Object} session - Active session object
   * @returns {Promise<{completed: boolean, question: Object|null, progress: Object}>}
   */
  static async getNextQuestion(session) {
    const allQuestions = await db.getQuestions(session.clinical_system, session.condition_id);
    const existingAnswers = await db.getSessionAnswers(session.id);

    const answeredIds = new Set(existingAnswers.map(a => a.question_id));
    const answersByQuestionId = {};
    for (const ans of existingAnswers) {
      answersByQuestionId[ans.question_id] = ans;
    }

    // Filter candidate questions that have not yet been answered
    const candidateQuestions = allQuestions.filter(q => !answeredIds.has(q.id));

    let nextQuestion = null;

    for (const q of candidateQuestions) {
      // Check conditional parent dependency if present
      if (q.parent_question_id) {
        const parentAns = answersByQuestionId[q.parent_question_id];
        if (!parentAns) {
          // Parent not answered yet, cannot ask this conditional question
          continue;
        }

        const parentVal = String(parentAns.raw_answer || '').toLowerCase().trim();
        const expectedVal = String(q.trigger_value || '').toLowerCase().trim();

        let conditionMet = false;
        if (q.trigger_operator === 'equals') {
          conditionMet = parentVal === expectedVal;
        } else if (q.trigger_operator === 'contains') {
          conditionMet = parentVal.includes(expectedVal);
        } else if (q.trigger_operator === 'not_equals') {
          conditionMet = parentVal !== expectedVal;
        } else {
          conditionMet = parentVal === expectedVal;
        }

        if (!conditionMet) {
          continue; // Skip this conditional question
        }
      }

      // First unanswered valid question in sequence order
      nextQuestion = q;
      break;
    }

    const totalQuestions = allQuestions.length;
    const answeredCount = answeredIds.size;
    const percentComplete = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 100;

    if (!nextQuestion) {
      return {
        completed: true,
        question: null,
        progress: {
          current: answeredCount,
          total: totalQuestions,
          percent: 100
        }
      };
    }

    const lang = session.language || 'en';
    const localizedText = lang === 'hi' ? nextQuestion.question_text_hi : nextQuestion.question_text_en;
    const localizedHelp = lang === 'hi' ? nextQuestion.help_text_hi : nextQuestion.help_text_en;

    const formattedOptions = (nextQuestion.options || []).map(opt => ({
      value: opt.value,
      text: lang === 'hi' ? opt.text_hi : opt.text_en
    }));

    return {
      completed: false,
      question: {
        id: nextQuestion.id,
        clinicalField: nextQuestion.clinical_field,
        type: nextQuestion.question_type,
        text: localizedText,
        helpText: localizedHelp,
        sequence: nextQuestion.sequence,
        required: nextQuestion.required,
        options: formattedOptions
      },
      progress: {
        current: answeredCount + 1,
        total: totalQuestions,
        percent: percentComplete
      }
    };
  }
}

module.exports = QuestionEngine;
