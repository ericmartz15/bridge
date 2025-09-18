// class CSP {
//   constructor(staffers, shifts, settings) {
//     this.shifts = shifts;
//     this.staffers = staffers.filter((staffer) => !staffer.floater);
//     this.threshold = settings;
//     this.domains = this.assignDomains();
//     this.numStaffers = this.staffers.length;
//     this.solution = null;
//     this.bestSolution = null;
//     this.bestScore = -Infinity;
//     this.assignedShifts = new Set();
//     this.backtrackCallCount = 0;
//     this.phase = 1; // Start with phase 1
//     this.solutionCount = 0;
//     this.noNewSolutionCount = 0;
//     this.maxNoNewSolutionCount = 100;
//     this.solutionsSet = new Set();
//     this.problemShifts = new Set();
//   }

//   assignDomains() {
//     let domains = {};
//     for (let shift of this.shifts) {
//       domains[shift.index] = this.staffers.filter((staffer) => {
//         let score = staffer.getPreferenceScore(shift);
//         return score > this.threshold;
//       });
//     }
//     console.log("Domains:", domains);
//     for (const [shiftIndex, staffers] of Object.entries(domains)) {
//       if (staffers.length === 0) {
//         console.log(`Domain for shift ${shiftIndex} is empty.`);
//         this.problemShifts.add(shiftIndex);
//       }
//     }
//     const domainNames = this.getDomainNames(domains);
//     return domains;
//   }
//   // assignDomains() {
//   //   let domains = {};
//   //   for (let shift of this.shifts) {
//   //     const eligibleStaffers = this.staffers.filter((staffer) => {
//   //       let score = staffer.getPreferenceScore(shift);
//   //       return score > this.threshold;
//   //     });

//   //     // If no staffers are eligible for this shift, add it to problemShifts
//   //     if (eligibleStaffers.length === 0) {
//   //       this.problemShifts.add(shift);
//   //     }

//   //     domains[shift.index] = eligibleStaffers;
//   //   }
//   //   const domainNames = this.getDomainNames(domains);
//   //   return domains;
//   // }

//   getDomainNames(domains) {
//     return Object.keys(domains).reduce((acc, shiftIndex) => {
//       acc[shiftIndex] = domains[shiftIndex].map((staffer) => staffer.name);
//       return acc;
//     }, {});
//   }

//   solve() {
//     const assignment = {};
//     this.backtrack(assignment, this.domains);
//     // console.log("Best solution: ", this.bestSolution);
//     return this.bestSolution;
//   }

//   backtrack(assignment, domains) {
//     this.backtrackCallCount++;
//     if (this.backtrackCallCount % 100 == 0) {
//       console.log(`\n--- Backtrack call #${this.backtrackCallCount} ---`);
//     }

//     if (this.solutionCount > 20) {
//       return;
//     }

//     if (
//       Object.keys(assignment).length === this.shifts.length &&
//       this.allShiftsHaveMinStaffers(assignment) &&
//       this.allStaffersAssigned(assignment)
//     ) {
//       let score = this.calculateScore(assignment);
//       this.solutionCount++;
//       this.noNewSolutionCount = 0;
//       if (score > this.bestScore) {
//         console.log("New best solution found");
//         console.log(`Score for this solution: ${score}`);
//         this.bestScore = score;
//         this.bestSolution = JSON.parse(JSON.stringify(assignment));
//       } else {
//         // console.log(
//         //   "Complete assignment found but not better than the best one."
//         // );
//       }
//       console.log("Solution count: ", this.solutionCount);
//       return;
//     }

//     this.noNewSolutionCount++;

//     if (this.phase === 1 && this.allShiftsHaveMinStaffers(assignment)) {
//       this.phase = 2; // Move to Phase 2
//     }

//     let shift = this.selectUnassignedShift(assignment);

//     if (!shift) {
//       return;
//     }

//     let domainCopy = JSON.parse(JSON.stringify(domains));

//     for (let staffer of this.orderDomainValues(shift.index, assignment)) {
//       if (this.isConsistent(staffer, shift.index, assignment)) {
//         if (!assignment[shift.index]) {
//           assignment[shift.index] = [];
//         }
//         // console.log(`Assigning ${staffer.name} to shift ${shift.index}`);
//         assignment[shift.index].push(staffer);
//         this.assignedShifts.add(staffer.name);

//         if (this.forwardCheck(shift.index, domains, staffer)) {
//           this.backtrack(assignment, domains);
//         }
//         // console.log(`Unassigning ${staffer.name} from shift ${shift.index}`);

//         assignment[shift.index].pop();
//         this.assignedShifts.delete(staffer.name);
//         // console.log("Assigned shifts after unassignment:", this.assignedShifts);

//         domains = JSON.parse(JSON.stringify(domainCopy));
//       }
//     }

//     return null;
//   }

//   allShiftsHaveMinStaffers(assignment) {
//     return this.shifts.every(
//       (shift) => assignment[shift.index] && assignment[shift.index].length >= 1
//     );
//   }

//   allStaffersAssigned(assignment) {
//     let assignedStaffers = new Set();

//     for (let shiftIndex in assignment) {
//       for (let staffer of assignment[shiftIndex]) {
//         assignedStaffers.add(staffer.name);
//       }
//     }

//     return this.staffers.every((staffer) => assignedStaffers.has(staffer.name));
//   }

//   orderDomainValues(shiftIndex, assignment) {
//     let stafferConflicts = {};

//     for (let staffer of this.domains[shiftIndex]) {
//       let conflictCount = 0;

//       for (let otherShift of this.shifts) {
//         if (
//           otherShift.index !== shiftIndex &&
//           this.domains[otherShift.index].includes(staffer)
//         ) {
//           conflictCount++;
//         }
//       }

//       stafferConflicts[staffer.name] = conflictCount;
//     }

//     return this.domains[shiftIndex].sort(
//       (a, b) => stafferConflicts[a.name] - stafferConflicts[b.name]
//     );
//   }

//   calculateScore(assignment) {
//     let totalScore = 0;

//     for (let shiftIndex in assignment) {
//       let assignedStaffers = assignment[shiftIndex];
//       let isDoubleShift = assignedStaffers.length === 2;

//       for (let staffer of assignedStaffers) {
//         let shift = this.shifts.find((shift) => shift.index == shiftIndex);
//         let preferenceScore = staffer.getPreferenceScore(shift);
//         totalScore += preferenceScore;

//         if (staffer.wantsDoubleShift() && isDoubleShift) {
//           totalScore += 10;
//           // console.log(
//           //   `Staffer ${staffer.name} prefers double shift and is assigned to one. +10 bonus.`
//           // );
//         } else if (staffer.wantsSoloShift() && !isDoubleShift) {
//           totalScore += 0;
//         } else if (staffer.isIndifferent()) {
//           totalScore += 0;
//         }
//       }
//     }

//     return totalScore;
//   }

//   forwardCheck(shiftIndex, domains, staffer) {
//     // let conflictThreshold = 2;
//     // let conflicts = 0;

//     // for (let otherShiftIndex in domains) {
//     //   if (otherShiftIndex != shiftIndex) {
//     //     if (domains[otherShiftIndex].length <= 3) {
//     //       // Only prune when the domain is small
//     //       let newDomain = domains[otherShiftIndex].filter(
//     //         (s) => s.name !== staffer.name
//     //       );

//     //       if (newDomain.length === 0) {
//     //         return false;
//     //       }

//     //       if (newDomain.length < domains[otherShiftIndex].length) {
//     //         conflicts++;
//     //       }

//     //       if (conflicts > conflictThreshold) {
//     //         return false;
//     //       }

//     //       domains[otherShiftIndex] = newDomain;
//     //     }
//     //   }
//     // }

//     return true;
//   }

//   selectUnassignedShift(assignment) {
//     let unassignedShifts = this.shifts.filter(
//       (shift) =>
//         (this.phase === 1 &&
//           (!assignment[shift.index] || assignment[shift.index].length < 1)) ||
//         (this.phase === 2 && assignment[shift.index].length < 2)
//     );
//     let selectedShift = unassignedShifts.reduce((a, b) =>
//       this.domains[a.index].length < this.domains[b.index].length ? a : b
//     );
//     return selectedShift;
//   }

//   isConsistent(staffer, shiftIndex, assignment) {
//     if (this.assignedShifts.has(staffer.name)) {
//       return false;
//     }
//     if (
//       this.phase === 1 &&
//       assignment[shiftIndex] &&
//       assignment[shiftIndex].length >= 1
//     ) {
//       return false;
//     }
//     if (
//       this.phase === 2 &&
//       assignment[shiftIndex] &&
//       assignment[shiftIndex].length >= 2
//     ) {
//       return false;
//     }
//     return true;
//   }
// }
// class CSP {
//   constructor(staffers, shifts, settings) {
//     this.shifts = shifts;
//     this.staffers = staffers.filter((staffer) => !staffer.floater);
//     this.threshold = settings;
//     this.domains = this.assignDomains();
//     this.numStaffers = this.staffers.length;
//     this.bestSolution = null;
//     this.bestScore = -Infinity;
//     this.assignedShifts = new Set();
//     // CRITICAL: Global static counter that cannot be reset
//     this.backtrackCallCount = 0;
//     this.ABSOLUTE_MAX_CALLS = 1990; // Leave room for overhead
//     this.phase = 1;
//     this.problemShifts = new Set();
//   }

//   assignDomains() {
//     let domains = {};
//     for (let shift of this.shifts) {
//       domains[shift.index] = this.staffers.filter((staffer) => {
//         let score = staffer.getPreferenceScore(shift);
//         return score > this.threshold;
//       });
//     }
//     return domains;
//   }

//   solve() {
//     const assignment = {};
//     // Critical: Set a flag to track termination
//     let terminated = false;

//     try {
//       this.backtrackWithLimit(assignment);
//     } catch (e) {
//       terminated = true;
//       console.log(
//         "Search forcibly terminated after " + this.backtrackCallCount + " calls"
//       );
//     }

//     if (!terminated) {
//       console.log(
//         "Search completed normally after " + this.backtrackCallCount + " calls"
//       );
//     }

//     return this.bestSolution;
//   }

//   // The key method with guaranteed termination
//   backtrackWithLimit(assignment) {
//     // ABSOLUTELY CRITICAL: Increment counter first thing and check immediately
//     this.backtrackCallCount++;

//     // Direct immediate return with no exception handling that could be bypassed
//     if (this.backtrackCallCount >= this.ABSOLUTE_MAX_CALLS) {
//       throw new Error("Hard limit reached");
//     }

//     // Save any assignment as a potential solution
//     if (Object.keys(assignment).length > 0) {
//       const score = this.calculateScore(assignment);
//       if (score > this.bestScore) {
//         this.bestScore = score;
//         this.bestSolution = JSON.parse(JSON.stringify(assignment));
//       }
//     }

//     // Exit condition for complete solution
//     if (
//       Object.keys(assignment).length === this.shifts.length &&
//       this.allShiftsHaveMinStaffers(assignment)
//     ) {
//       return;
//     }

//     // Phase transition
//     if (this.phase === 1 && this.allShiftsHaveMinStaffers(assignment)) {
//       this.phase = 2;
//     }

//     // Select next variable - simplest possible implementation
//     let shift = null;
//     for (const s of this.shifts) {
//       if (this.phase === 1) {
//         if (!assignment[s.index] || assignment[s.index].length < 1) {
//           shift = s;
//           break;
//         }
//       } else {
//         // Phase 2
//         if (assignment[s.index] && assignment[s.index].length < 2) {
//           shift = s;
//           break;
//         }
//       }
//     }

//     if (!shift) return;

//     // Try each value - limit to 3 values to reduce search space
//     const availableStaffers = this.domains[shift.index]
//       .filter((staffer) => !this.assignedShifts.has(staffer.name))
//       .slice(0, 3); // Only try max 3 staffers per shift for speed

//     for (let staffer of availableStaffers) {
//       // CRITICAL: Check counter before any recursive operations
//       if (this.backtrackCallCount >= this.ABSOLUTE_MAX_CALLS) {
//         throw new Error("Hard limit reached during value iteration");
//       }

//       // Simple consistency check
//       if (this.assignedShifts.has(staffer.name)) continue;

//       if (
//         this.phase === 1 &&
//         assignment[shift.index] &&
//         assignment[shift.index].length >= 1
//       ) {
//         continue;
//       }

//       if (
//         this.phase === 2 &&
//         assignment[shift.index] &&
//         assignment[shift.index].length >= 2
//       ) {
//         continue;
//       }

//       // Make assignment
//       if (!assignment[shift.index]) {
//         assignment[shift.index] = [];
//       }

//       assignment[shift.index].push(staffer);
//       this.assignedShifts.add(staffer.name);

//       // Recursive call - but ONLY if we haven't exceeded our limit
//       if (this.backtrackCallCount < this.ABSOLUTE_MAX_CALLS) {
//         this.backtrackWithLimit(assignment);
//       }

//       // Backtrack
//       assignment[shift.index].pop();
//       if (assignment[shift.index].length === 0) {
//         delete assignment[shift.index];
//       }
//       this.assignedShifts.delete(staffer.name);
//     }
//   }

//   allShiftsHaveMinStaffers(assignment) {
//     return this.shifts.every(
//       (shift) => assignment[shift.index] && assignment[shift.index].length >= 1
//     );
//   }

//   calculateScore(assignment) {
//     let totalScore = 0;

//     for (let shiftIndex in assignment) {
//       let assignedStaffers = assignment[shiftIndex];
//       let isDoubleShift = assignedStaffers.length === 2;

//       for (let staffer of assignedStaffers) {
//         let shift = this.shifts.find((s) => s.index == shiftIndex);
//         let preferenceScore = staffer.getPreferenceScore(shift);
//         totalScore += preferenceScore;

//         if (
//           typeof staffer.wantsDoubleShift === "function" &&
//           staffer.wantsDoubleShift() &&
//           isDoubleShift
//         ) {
//           totalScore += 10;
//         }
//       }
//     }

//     return totalScore;
//   }
// }
// class CSP {
//   constructor(staffers, shifts, settings) {
//     this.shifts = shifts;
//     this.staffers = staffers.filter((staffer) => !staffer.floater);
//     this.threshold = settings;
//     this.domains = this.assignDomains();
//     this.numStaffers = this.staffers.length;
//     this.maxStafferUses = this.staffers.length; // NEW: Cap at 43
//     this.bestSolution = null;
//     this.bestScore = -Infinity;
//     this.assignedShifts = new Set();
//     this.backtrackCallCount = 0;
//     this.ABSOLUTE_MAX_CALLS = 1990;
//     this.phase = 1;
//     this.problemShifts = new Set();
//   }

//   assignDomains() {
//     let domains = {};
//     for (let shift of this.shifts) {
//       domains[shift.index] = this.staffers.filter((staffer) => {
//         let score = staffer.getPreferenceScore(shift);
//         return score > this.threshold;
//       });
//     }
//     return domains;
//   }

//   solve() {
//     const assignment = {};
//     let terminated = false;

//     try {
//       this.backtrackWithLimit(assignment);
//     } catch (e) {
//       terminated = true;
//       console.log(
//         "Search forcibly terminated after " + this.backtrackCallCount + " calls"
//       );
//     }

//     if (!terminated) {
//       console.log(
//         "Search completed normally after " + this.backtrackCallCount + " calls"
//       );
//     }

//     return this.bestSolution;
//   }

//   backtrackWithLimit(assignment) {
//     this.backtrackCallCount++;

//     if (this.backtrackCallCount >= this.ABSOLUTE_MAX_CALLS) {
//       throw new Error("Hard limit reached");
//     }

//     // NEW: stop assigning if we've used all staffers
//     if (this.assignedShifts.size >= this.maxStafferUses) {
//       return;
//     }

//     if (Object.keys(assignment).length > 0) {
//       const score = this.calculateScore(assignment);
//       if (score > this.bestScore) {
//         this.bestScore = score;
//         this.bestSolution = JSON.parse(JSON.stringify(assignment));
//       }
//     }

//     if (
//       Object.keys(assignment).length === this.shifts.length &&
//       this.allShiftsHaveMinStaffers(assignment) &&
//       this.assignedShifts.size === this.maxStafferUses
//     ) {
//       return;
//     }

//     if (this.phase === 1 && this.allShiftsHaveMinStaffers(assignment)) {
//       this.phase = 2;
//     }

//     let shift = null;
//     for (const s of this.shifts) {
//       if (this.phase === 1) {
//         if (!assignment[s.index] || assignment[s.index].length < 1) {
//           shift = s;
//           break;
//         }
//       } else {
//         if (assignment[s.index] && assignment[s.index].length < 2) {
//           shift = s;
//           break;
//         }
//       }
//     }

//     if (!shift) return;

//     const availableStaffers = this.domains[shift.index]
//       .filter((staffer) => !this.assignedShifts.has(staffer.name))
//       .sort((a, b) => b.getPreferenceScore(shift) - a.getPreferenceScore(shift)) // prioritize by score
//       .slice(0, 3);

//     for (let staffer of availableStaffers) {
//       if (this.backtrackCallCount >= this.ABSOLUTE_MAX_CALLS) {
//         throw new Error("Hard limit reached during value iteration");
//       }

//       if (this.assignedShifts.has(staffer.name)) continue;

//       if (
//         this.phase === 1 &&
//         assignment[shift.index] &&
//         assignment[shift.index].length >= 1
//       ) {
//         continue;
//       }

//       if (
//         this.phase === 2 &&
//         assignment[shift.index] &&
//         assignment[shift.index].length >= 2
//       ) {
//         continue;
//       }

//       if (!assignment[shift.index]) {
//         assignment[shift.index] = [];
//       }

//       assignment[shift.index].push(staffer);
//       this.assignedShifts.add(staffer.name);

//       if (this.backtrackCallCount < this.ABSOLUTE_MAX_CALLS) {
//         this.backtrackWithLimit(assignment);
//       }

//       assignment[shift.index].pop();
//       if (assignment[shift.index].length === 0) {
//         delete assignment[shift.index];
//       }
//       this.assignedShifts.delete(staffer.name);
//     }
//   }

//   allShiftsHaveMinStaffers(assignment) {
//     return this.shifts.every(
//       (shift) => assignment[shift.index] && assignment[shift.index].length >= 1
//     );
//   }

//   calculateScore(assignment) {
//     let totalScore = 0;

//     for (let shiftIndex in assignment) {
//       let assignedStaffers = assignment[shiftIndex];
//       let isDoubleShift = assignedStaffers.length === 2;

//       for (let staffer of assignedStaffers) {
//         let shift = this.shifts.find((s) => s.index == shiftIndex);
//         let preferenceScore = staffer.getPreferenceScore(shift);
//         totalScore += preferenceScore;

//         if (
//           typeof staffer.wantsDoubleShift === "function" &&
//           staffer.wantsDoubleShift() &&
//           isDoubleShift
//         ) {
//           totalScore += 10;
//         }
//       }
//     }

//     return totalScore;
//   }
// }
class CSP {
  constructor(staffers, shifts, settings) {
    this.shifts = shifts;
    this.staffers = staffers.filter((staffer) => !staffer.floater);
    this.threshold = settings;
    this.domains = this.assignDomains();
    this.numStaffers = this.staffers.length;
    this.maxStafferUses = this.numStaffers; // Ensure we use all staffers (43)
    this.bestSolution = null;
    this.bestScore = -Infinity;
    this.assignedStaffers = new Set(); // Track assigned staffers by name
    this.backtrackCallCount = 0;
    this.ABSOLUTE_MAX_CALLS = 1990;
    this.problemShifts = new Set();
    this.doubleShiftCount = this.numStaffers - this.shifts.length; // How many double shifts we need (43-35=8)
  }

  assignDomains() {
    let domains = {};
    for (let shift of this.shifts) {
      domains[shift.index] = this.staffers.filter((staffer) => {
        let score = staffer.getPreferenceScore(shift);
        return score > this.threshold;
      });

      // Track shifts with no viable staffers as problem shifts
      if (domains[shift.index].length === 0) {
        this.problemShifts.add(shift.index);
      }
    }
    return domains;
  }

  solve() {
    const assignment = {};
    let terminated = false;

    try {
      // First phase: Assign one staffer to each shift
      this.backtrackBasicAssignment(assignment);

      // Second phase: Add second staffers to 8 shifts
      if (this.bestSolution) {
        this.assignDoubleShifts(this.bestSolution);
      }
    } catch (e) {
      terminated = true;
      console.log(
        "Search forcibly terminated after " + this.backtrackCallCount + " calls"
      );
    }

    if (!terminated) {
      console.log(
        "Search completed normally after " + this.backtrackCallCount + " calls"
      );
    }

    return this.bestSolution;
  }

  // Phase 1: Assign one staffer to each shift
  backtrackBasicAssignment(assignment) {
    this.backtrackCallCount++;

    if (this.backtrackCallCount >= this.ABSOLUTE_MAX_CALLS) {
      throw new Error("Hard limit reached");
    }

    // Check if we have a better solution
    if (Object.keys(assignment).length > 0) {
      const score = this.calculateScore(assignment);
      if (score > this.bestScore) {
        this.bestScore = score;
        this.bestSolution = JSON.parse(JSON.stringify(assignment));
      }
    }

    // If all shifts have at least one staffer, we're done with phase 1
    if (Object.keys(assignment).length === this.shifts.length) {
      return;
    }

    // Find unassigned shift
    let nextShift = null;
    for (const shift of this.shifts) {
      if (!assignment[shift.index]) {
        nextShift = shift;
        break;
      }
    }

    if (!nextShift) return;

    // Get available staffers for this shift
    const availableStaffers = this.domains[nextShift.index]
      .filter((staffer) => !this.isStafferAssigned(staffer, assignment))
      .sort(
        (a, b) =>
          b.getPreferenceScore(nextShift) - a.getPreferenceScore(nextShift)
      );

    // Try each available staffer
    for (let staffer of availableStaffers.slice(0, 5)) {
      // Limit branching factor
      if (this.backtrackCallCount >= this.ABSOLUTE_MAX_CALLS) {
        throw new Error("Hard limit reached during value iteration");
      }

      // Assign this staffer to the shift
      assignment[nextShift.index] = [staffer];

      // Continue search
      this.backtrackBasicAssignment(assignment);

      // Backtrack
      delete assignment[nextShift.index];
    }
  }

  // Phase 2: Add second staffers to selected shifts
  assignDoubleShifts(assignment) {
    // Get unassigned staffers
    const assignedStafferNames = new Set();
    for (let shiftIndex in assignment) {
      for (let staffer of assignment[shiftIndex]) {
        assignedStafferNames.add(staffer.name);
      }
    }

    const unassignedStaffers = this.staffers.filter(
      (staffer) => !assignedStafferNames.has(staffer.name)
    );

    if (unassignedStaffers.length === 0) return;

    // Prioritize shifts for double staffing
    const shiftPriorities = [];

    for (const shift of this.shifts) {
      // Skip if this shift doesn't have a staffer assigned yet
      if (!assignment[shift.index]) continue;

      const currentStaffer = assignment[shift.index][0];
      let doubleShiftBonus =
        typeof currentStaffer.wantsDoubleShift === "function" &&
        currentStaffer.wantsDoubleShift()
          ? 100
          : 0;

      // Calculate average preference score of unassigned staffers for this shift
      let avgScore = 0;
      let validStafferCount = 0;

      for (const staffer of unassignedStaffers) {
        const score = staffer.getPreferenceScore(shift);
        if (score > this.threshold) {
          avgScore += score;
          validStafferCount++;
        }
      }

      if (validStafferCount > 0) {
        avgScore /= validStafferCount;
        shiftPriorities.push({
          shift,
          score: avgScore + doubleShiftBonus,
        });
      }
    }

    // Sort shifts by priority score
    shiftPriorities.sort((a, b) => b.score - a.score);

    // Assign double shifts
    let doubleShiftsAdded = 0;
    for (const { shift } of shiftPriorities) {
      if (
        doubleShiftsAdded >= this.doubleShiftCount ||
        unassignedStaffers.length === 0
      )
        break;

      // Find best staffer for this shift
      let bestStaffer = null;
      let bestScore = -Infinity;

      for (const staffer of unassignedStaffers) {
        const score = staffer.getPreferenceScore(shift);
        if (score > this.threshold && score > bestScore) {
          bestScore = score;
          bestStaffer = staffer;
        }
      }

      if (bestStaffer) {
        // Add second staffer to this shift
        assignment[shift.index].push(bestStaffer);

        // Remove from unassigned staffers
        const index = unassignedStaffers.indexOf(bestStaffer);
        if (index > -1) {
          unassignedStaffers.splice(index, 1);
        }

        doubleShiftsAdded++;
      }
    }
  }

  isStafferAssigned(staffer, assignment) {
    for (let shiftIndex in assignment) {
      if (assignment[shiftIndex].some((s) => s.name === staffer.name)) {
        return true;
      }
    }
    return false;
  }

  calculateScore(assignment) {
    let totalScore = 0;

    for (let shiftIndex in assignment) {
      let assignedStaffers = assignment[shiftIndex];
      let isDoubleShift = assignedStaffers.length === 2;

      for (let staffer of assignedStaffers) {
        let shift = this.shifts.find((s) => s.index == shiftIndex);
        let preferenceScore = staffer.getPreferenceScore(shift);
        totalScore += preferenceScore;

        if (
          typeof staffer.wantsDoubleShift === "function" &&
          staffer.wantsDoubleShift() &&
          isDoubleShift
        ) {
          totalScore += 10;
        }
      }
    }

    return totalScore;
  }
}
