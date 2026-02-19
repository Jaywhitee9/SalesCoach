/**
 * @fileoverview Type definitions for DBService
 * These JSDoc types provide type safety for the database service layer
 * Import types from the shared types package
 */

/**
 * @typedef {import('../../types').DBLead} DBLead
 * @typedef {import('../../types').DBCall} DBCall
 * @typedef {import('../../types').DBProfile} DBProfile
 * @typedef {import('../../types').DBOrganization} DBOrganization
 * @typedef {import('../../types').DBTask} DBTask
 * @typedef {import('../../types').DBNotification} DBNotification
 * @typedef {import('../../types').DBCampaign} DBCampaign
 * @typedef {import('../../types').DBApiKey} DBApiKey
 * @typedef {import('../../types').DBOrganizationSettings} DBOrganizationSettings
 * @typedef {import('../../types').DBPhoneNumber} DBPhoneNumber
 * @typedef {import('../../types').DBKnowledge} DBKnowledge
 * @typedef {import('../../types').DBCallSummary} DBCallSummary
 * @typedef {import('../../types').Lead} Lead
 * @typedef {import('../../types').Call} Call
 * @typedef {import('../../types').Transcript} Transcript
 * @typedef {import('../../types').AccumulatedSignals} AccumulatedSignals
 * @typedef {import('../../types').SupabaseResponse} SupabaseResponse
 */

/**
 * @typedef {Object} CallData
 * @property {string} callSid - Twilio Call SID
 * @property {string} [agentId] - Agent user ID
 * @property {string} leadId - Lead ID
 * @property {number} startTime - Call start timestamp
 * @property {Transcript} [transcripts] - Call transcripts
 * @property {string[]} [coachingHistory] - Coaching tips given during call
 * @property {AccumulatedSignals} [accumulatedSignals] - Detected signals
 * @property {Object} [summary] - Call summary
 * @property {string} summary.summary - Summary text
 * @property {number} [summary.score] - Quality score
 * @property {boolean} [summary.success] - Whether call was successful
 */

/**
 * @typedef {Object} MessageData
 * @property {string} callId - Call ID
 * @property {string} leadId - Lead ID
 * @property {'agent'|'customer'} role - Speaker role
 * @property {string} text - Message text
 * @property {boolean} isFinal - Whether this is the final transcript
 */

/**
 * @typedef {Object} StatsMetrics
 * @property {Object} calls - Call statistics
 * @property {number} calls.answered - Answered calls count
 * @property {number} calls.total - Total calls count
 * @property {number} appointments - Appointments count
 * @property {number} newLeads - New leads count
 * @property {number} avgCallTime - Average call duration in seconds
 * @property {number} qualityScore - Average quality score
 * @property {string} timeRange - Time range for stats
 */

/**
 * @typedef {Object} WeeklyPerformanceData
 * @property {string} name - Day name
 * @property {string} date - Date string
 * @property {number} calls - Total calls
 * @property {number} successful - Successful calls
 * @property {number} rate - Success rate percentage
 */

/**
 * @typedef {Object} HotLead
 * @property {string} id
 * @property {string} name
 * @property {string} company
 * @property {string} phone
 * @property {number} score
 * @property {number} daysSinceCreated
 * @property {string} status
 */

/**
 * @typedef {Object} LeadAtRisk
 * @property {string} id
 * @property {string} name
 * @property {string} company
 * @property {string} phone
 * @property {string} timeSinceActivity
 * @property {number} hoursSinceActivity
 * @property {string} status
 */

/**
 * @typedef {Object} QueuedLead
 * @property {string} id
 * @property {string} name
 * @property {string} company
 * @property {string} phone
 * @property {string} status
 * @property {string} priority
 * @property {string} lastActivity
 * @property {string} nextStep
 * @property {string} [source]
 */

/**
 * @typedef {Object} PanelStatsResult
 * @property {Object} targets
 * @property {number} targets.calls
 * @property {number} targets.newLeads
 * @property {number} targets.meetings
 * @property {number} targets.deals
 * @property {Object} current
 * @property {number} current.calls
 * @property {number} current.newLeads
 * @property {number} current.meetings
 * @property {number} current.deals
 * @property {Object} progress
 * @property {number} progress.calls
 * @property {number} progress.newLeads
 * @property {number} progress.meetings
 * @property {number} progress.deals
 * @property {Object} [trend]
 * @property {number} trend.calls
 * @property {number} trend.newLeads
 * @property {number} trend.meetings
 * @property {number} trend.deals
 */

/**
 * @typedef {Object} FunnelStage
 * @property {string} id
 * @property {string} label
 * @property {number} count
 * @property {number} percentage
 * @property {number} conversionRate
 * @property {string} color
 */

/**
 * @typedef {Object} SourceMetric
 * @property {string} name
 * @property {number} leads
 * @property {number} deals
 * @property {number} conversionRate
 * @property {number} revenue
 */

/**
 * @typedef {Object} TeamMemberPerformance
 * @property {string} id
 * @property {string} full_name
 * @property {string} [avatar_url]
 * @property {number} calls
 * @property {number} meetings
 * @property {number} winRate
 * @property {number} qualityScore
 * @property {'up'|'down'|'neutral'} trend
 */

/**
 * @typedef {Object} AgentLiveStatus
 * @property {string} agentId
 * @property {string} name
 * @property {string} [avatar]
 * @property {'available'|'on_call'|'wrap_up'|'offline'} status
 * @property {string} [currentLead]
 * @property {number} [callDuration]
 */

/**
 * @typedef {Object} CreateLeadInput
 * @property {string} organization_id
 * @property {string} name
 * @property {string} phone
 * @property {string} [email]
 * @property {string} [company]
 * @property {string} [source]
 * @property {string} [status]
 * @property {string} [priority]
 * @property {number} [value]
 * @property {string[]} [tags]
 */

/**
 * @typedef {Object} CreateCampaignInput
 * @property {string} organizationId
 * @property {string} name
 * @property {string} sourceFilter
 * @property {string} [description]
 */

/**
 * @typedef {Object} UpsertKnowledgeInput
 * @property {string} organizationId
 * @property {string} domain
 * @property {string} knowledge_type
 * @property {string} title
 * @property {string} content
 * @property {string} [id]
 */

module.exports = {};
