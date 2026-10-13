"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeIncidentReport = analyzeIncidentReport;
exports.explainScenarioFailure = explainScenarioFailure;
const config_js_1 = require("../config.js");
async function analyzeIncidentReport(title, description, locationName, zone) {
    // If Gemini API Key is configured, attempt real Gemini call
    if (config_js_1.config.geminiApiKey) {
        try {
            const prompt = `You are SAFENET AI's Women Safety Emergency Triage Assistant.
Analyze the following women safety incident/distress report. Focus strictly on rapid emergency response triage, responder dispatch, and immediate protective safeguards.

Incident Title: ${title}
Description: ${description}
Location: ${locationName} (Zone: ${zone})

Respond ONLY with valid JSON in this exact structure:
{
  "summary": "Concise 1-2 sentence operational summary highlighting immediate safety risk",
  "suggested_category": "STALKING_HARASSMENT" | "SAFE_ESCORT_REQUEST" | "CAB_TRANSIT_EMERGENCY" | "IMMEDIATE_ASSAULT_SOS" | "UNSAFE_ENVIRONMENT" | "MEDICAL_FIRST_AID" | "SECURITY_DISRUPTION",
  "suggested_priority": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "missing_information": ["List of critical operational details needed for dispatch (e.g. vehicle plate, moving vs static, physical description)"],
  "reasoning": "Brief explanation for the category and priority assignment based on immediate threat level",
  "confidence": 0.90
}`;
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${config_js_1.config.geminiApiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { responseMimeType: 'application/json' }
                })
            });
            if (res.ok) {
                const data = await res.json();
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                    const parsed = JSON.parse(text);
                    return {
                        summary: parsed.summary || title,
                        suggested_category: parsed.suggested_category || 'STALKING_HARASSMENT',
                        suggested_priority: parsed.suggested_priority || 'HIGH',
                        missing_information: Array.isArray(parsed.missing_information) ? parsed.missing_information : [],
                        reasoning: parsed.reasoning || 'Derived via Gemini operational women safety triage.',
                        source: 'GEMINI_AI',
                        confidence: parsed.confidence || 0.9,
                    };
                }
            }
        }
        catch (err) {
            console.warn('Gemini API call failed or timed out, falling back to rule-based analysis:', err);
        }
    }
    // Deterministic rule-based fallback
    return runRuleBasedIncidentAnalysis(title, description, zone);
}
function runRuleBasedIncidentAnalysis(title, description, zone) {
    const text = `${title} ${description}`.toLowerCase();
    let category = 'STALKING_HARASSMENT';
    let priority = 'HIGH';
    const missing = [];
    let reasoning = 'Evaluated using Women Safety operational keyword taxonomy.';
    // 1. Immediate Assault / Physical Threat
    if (text.includes('assault') || text.includes('attack') || text.includes('scream') || text.includes('violence') || text.includes('grab') || text.includes('weapon') || text.includes('danger')) {
        category = 'IMMEDIATE_ASSAULT_SOS';
        priority = 'CRITICAL';
        reasoning = 'Physical assault or violent threat indicators warrant immediate critical Pink Patrol & QRT dispatch.';
    }
    // 2. Cab / Transit Deviation Distress
    else if (text.includes('cab') || text.includes('taxi') || text.includes('uber') || text.includes('ola') || text.includes('auto') || text.includes('driver') || text.includes('route') || text.includes('deviation') || text.includes('locked')) {
        category = 'CAB_TRANSIT_EMERGENCY';
        priority = 'CRITICAL';
        reasoning = 'Suspicious cab/transit deviation detected. High abduction/assault risk; immediate intercept dispatch required.';
    }
    // 3. Stalking / Harassment / Following
    else if (text.includes('stalk') || text.includes('follow') || text.includes('harass') || text.includes('eve-teas') || text.includes('catcall') || text.includes('pursu') || text.includes('shadow')) {
        category = 'STALKING_HARASSMENT';
        priority = text.includes('corner') || text.includes('dark') ? 'CRITICAL' : 'HIGH';
        reasoning = 'Active stalking or harassment behavior detected; fast intercept and field verification initiated.';
    }
    // 4. Safe Escort Request
    else if (text.includes('escort') || text.includes('alone') || text.includes('night walk') || text.includes('walk home') || text.includes('hostel') || text.includes('companion') || text.includes('desolate')) {
        category = 'SAFE_ESCORT_REQUEST';
        priority = 'HIGH';
        reasoning = 'Lone commuter night escort request registered; assigning nearest standby female marshal or patrol officer.';
    }
    // 5. Unsafe Environment / Dark Corridor
    else if (text.includes('dark') || text.includes('broken light') || text.includes('streetlight') || text.includes('no cctv') || text.includes('dim') || text.includes('hazard') || text.includes('blind spot')) {
        category = 'UNSAFE_ENVIRONMENT';
        priority = 'MEDIUM';
        reasoning = 'Environmental vulnerability identified; facilities work order and increased patrol frequency flagged.';
    }
    // 6. Generic emergency fallbacks for test compatibility
    else if (text.includes('fire') || text.includes('smoke') || text.includes('alarm')) {
        category = 'FIRE_SMOKE_ALARM';
        priority = 'CRITICAL';
        reasoning = 'Smoke/fire indicators warrant critical response.';
    }
    else if (text.includes('blood') || text.includes('unconscious') || text.includes('injury') || text.includes('fall')) {
        category = 'MEDICAL_FIRST_AID';
        priority = 'HIGH';
        reasoning = 'Medical terms detected; triage priority set based on injury severity.';
    }
    // Missing information heuristics for Women Safety operations
    if (!zone || zone.trim() === '') {
        missing.push('Precise sector zone or nearest landmark / exit gate not specified');
    }
    if (category === 'CAB_TRANSIT_EMERGENCY' && !text.includes('plate') && !text.includes('number') && !text.includes('registration')) {
        missing.push('Cab license plate number or vehicle color/make omitted');
    }
    if (!text.includes('safe') && !text.includes('shelter') && !text.includes('inside') && !text.includes('moving')) {
        missing.push('Current caller safety status (sheltered in safe zone vs actively moving in open) not specified');
    }
    if (!text.includes('contact') && !text.includes('phone') && !text.includes('number')) {
        missing.push('Emergency callback phone number omitted');
    }
    return {
        summary: `${category.replace(/_/g, ' ')} flagged in Women Safety network. Dispatching nearest patrol team.`,
        suggested_category: category,
        suggested_priority: priority,
        missing_information: missing,
        reasoning,
        source: 'RULE_BASED_FALLBACK',
        confidence: 0.85,
    };
}
async function explainScenarioFailure(scenarioTitle, failedChecks, gaps) {
    // If Gemini is configured, use it for contextual synthesis
    if (config_js_1.config.geminiApiKey) {
        try {
            const prompt = `Analyze this emergency response scenario failure deterministically observed by SAFETEST AI:
Scenario: ${scenarioTitle}
Failed Checks:
${JSON.stringify(failedChecks, null, 2)}
Identified Gaps:
${JSON.stringify(gaps, null, 2)}

Provide a concise operational diagnosis in JSON:
{
  "summary": "1 sentence executive summary of the procedural breakdown",
  "root_cause": "Specific operational cause (e.g. missing fallback rule, SLA timer expiry)",
  "recommended_action": "Concrete operational remedy"
}`;
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${config_js_1.config.geminiApiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { responseMimeType: 'application/json' }
                })
            });
            if (res.ok) {
                const data = await res.json();
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                    const parsed = JSON.parse(text);
                    return {
                        summary: parsed.summary,
                        root_cause: parsed.root_cause,
                        recommended_action: parsed.recommended_action,
                        source: 'GEMINI_AI'
                    };
                }
            }
        }
        catch (e) {
            // Fall through to deterministic
        }
    }
    return {
        summary: `Procedural failure observed in ${scenarioTitle} across ${failedChecks.length} test verification check(s).`,
        root_cause: gaps[0] || 'Unresolved operational check discrepancy.',
        recommended_action: 'Adjust dispatch fallback matrix to version v2.0 and verify automated failover trigger.',
        source: 'DETERMINISTIC_EVALUATOR'
    };
}
