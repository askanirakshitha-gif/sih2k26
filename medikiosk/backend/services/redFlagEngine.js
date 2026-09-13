/**
 * Deterministic Red-Flag Detection Engine
 * Evaluates clinical rules strictly on clinical criteria without LLM hallucination.
 * Safety Rule: Do not make a definitive diagnosis. Alert hospital staff to potential emergency warning signs.
 */

const { db } = require('./db');

class RedFlagEngine {
  /**
   * Evaluate whether a given answer or accumulated answers trigger a red flag.
   * @param {Object} params
   * @param {string} params.conditionId
   * @param {string} params.clinicalField
   * @param {any} params.answerValue
   * @param {Array} params.previousAnswers
   * @param {string} params.language
   * @returns {Promise<{isRedFlag: boolean, redFlags: Array}>}
   */
  static async evaluate({ conditionId, clinicalField, answerValue, previousAnswers = [], language = 'en' }) {
    const rules = await db.getRedFlags(conditionId);
    const triggered = [];

    const stringAnswer = String(answerValue || '').toLowerCase().trim();

    for (const rule of rules) {
      if (rule.clinical_field !== clinicalField) continue;

      let match = false;
      const target = String(rule.trigger_value).toLowerCase().trim();

      switch (rule.operator) {
        case 'equals':
          match = stringAnswer === target;
          break;

        case 'contains':
          match = stringAnswer.includes(target);
          break;

        case 'greater_than_or_equal':
          const numVal = parseFloat(stringAnswer);
          const numTarget = parseFloat(target);
          if (!isNaN(numVal) && !isNaN(numTarget)) {
            match = numVal >= numTarget;
          }
          break;

        case 'in':
          const allowed = target.split(',').map(s => s.trim());
          match = allowed.includes(stringAnswer);
          break;

        default:
          break;
      }

      if (match) {
        triggered.push({
          ruleId: rule.id,
          ruleName: rule.rule_name,
          clinicalField: rule.clinical_field,
          severity: rule.severity,
          message: language === 'hi' ? rule.warning_message_hi : rule.warning_message_en,
          rationale: rule.clinical_rationale
        });
      }
    }

    // Additional cross-field deterministic emergency checks
    if (clinicalField === 'breathlessness' && stringAnswer === 'yes') {
      const severityAnswer = previousAnswers.find(a => a.clinical_field === 'severity');
      if (severityAnswer && parseFloat(severityAnswer.raw_answer) >= 7) {
        triggered.push({
          ruleId: 'rf_severe_dyspnea_combo',
          ruleName: 'Severe Chest Pain with Acute Dyspnea',
          clinicalField: 'breathlessness',
          severity: 'CRITICAL',
          message: language === 'hi' 
            ? 'संभावित चेतावनी संकेत: अत्यधिक छाती के दर्द के साथ सांस फूलना गंभीर स्थिति हो सकती है। कृपया तुरंत अस्पताल स्टाफ को सूचित करें।'
            : 'Potential warning sign detected: Acute breathlessness accompanied by high chest pain intensity requires immediate triage.',
          rationale: 'Combined cardiopulmonary distress warrants immediate STAT triage.'
        });
      }
    }

    return {
      isRedFlag: triggered.length > 0,
      redFlags: triggered
    };
  }
}

module.exports = RedFlagEngine;
