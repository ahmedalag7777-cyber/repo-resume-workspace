import { describe,expect,it } from 'vitest';
import { canClaimActualOutcome,canClaimDelta,canClaimFeedback,canClaimLearning,canClaimOutcomeQuality,canClaimVerifiedEvidence,canTransitionDecision,OUTCOME_EMPTY_STATE } from './product-experience-contract';

describe('product experience truth contract',()=>{
  it('fails closed until runtime evidence is actually available',()=>{
    expect(OUTCOME_EMPTY_STATE.actual).toBe('NOT_YET_EXECUTED');
    expect(canClaimVerifiedEvidence('NOT_AVAILABLE')).toBe(false);
    expect(canClaimActualOutcome('NOT_YET_EXECUTED')).toBe(false);
    expect(canClaimDelta('NOT_YET_EXECUTED','AVAILABLE')).toBe(false);
    expect(canClaimOutcomeQuality('NOT_YET_EXECUTED','AVAILABLE')).toBe(false);
    expect(canClaimFeedback('RUNTIME_BLOCKED')).toBe(false);
    expect(canClaimLearning('NOT_YET_EXECUTED','AVAILABLE')).toBe(false);
  });
  it('allows only the canonical decision lifecycle transitions',()=>{
    expect(canTransitionDecision('PROPOSED','PENDING_APPROVAL')).toBe(true);
    expect(canTransitionDecision('PENDING_APPROVAL','APPROVED')).toBe(true);
    expect(canTransitionDecision('APPROVED','OPEN')).toBe(true);
    expect(canTransitionDecision('OPEN','COMPLETED')).toBe(false);
    expect(canTransitionDecision('OUTCOME','PROPOSED')).toBe(false);
  });
});
