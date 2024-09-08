class CSP {
  constructor(staffers, shifts) {
    this.shifts = shifts;
    this.staffers = staffers.filter((staffer) => !staffer.floater);
    this.domains = this.assignDomains();
    this.numStaffers = this.staffers.length;
    this.solution = null;
    this.bestSolution = null;
    this.bestScore = -Infinity;
    this.assignedShifts = {};
    this.backtrackCallCount = 0;
    this.phase = 1; // Start with phase 1
    this.solutionCount = 0;
    this.noNewSolutionCount = 0;
    this.maxNoNewSolutionCount = 50;
    this.solutionsSet = new Set(); // Initialize an empty set
  }

  assignDomains() {
    let domains = {};
    for (let shift of this.shifts) {
      domains[shift.index] = this.staffers.filter((staffer) => {
        let score = staffer.getPreferenceScore(shift);
        return score > 1; // Exclude NOOO
      });
    }
    const domainNames = this.getDomainNames(domains);
    return domains;
  }

  getDomainNames(domains) {
    return Object.keys(domains).reduce((acc, shiftIndex) => {
      acc[shiftIndex] = domains[shiftIndex].map((staffer) => staffer.name);
      return acc;
    }, {});
  }

  solve() {
    const assignment = {};
    this.backtrack(assignment, this.domains);
    console.log("Best solution: ", this.bestSolution);
    return this.bestSolution;
  }

  backtrack(assignment, domains) {
    this.backtrackCallCount++;
    if (this.backtrackCallCount % 100 == 0) {
      console.log(`\n--- Backtrack call #${this.backtrackCallCount} ---`);
    }
    if (this.noNewSolutionCount >= this.maxNoNewSolutionCount) {
      // console.log(
      //   "Stopping due to 100 backtrack calls without a new solution."
      // );
      return;
    }

    if (
      Object.keys(assignment).length === this.shifts.length &&
      this.allShiftsHaveMinStaffers(assignment) &&
      this.allStaffersAssigned(assignment)
    ) {
      let score = this.calculateScore(assignment);
      this.solutionCount++;
      this.noNewSolutionCount = 0;
      if (score > this.bestScore) {
        // console.log("New best solution found");
        console.log(`Score for this solution: ${score}`);
        this.bestScore = score;
        this.bestSolution = JSON.parse(JSON.stringify(assignment));
      } else {
        // console.log(
        //   "Complete assignment found but not better than the best one."
        // );
      }
      // console.log("Solution count: ", this.solutionCount);
      return;
    }

    this.noNewSolutionCount++;

    if (this.phase === 1 && this.allShiftsHaveMinStaffers(assignment)) {
      this.phase = 2; // Move to Phase 2
    }

    let shift = this.selectUnassignedShift(assignment);

    if (!shift) {
      return;
    }

    let domainCopy = JSON.parse(JSON.stringify(domains));

    for (let staffer of this.orderDomainValues(shift.index, assignment)) {
      if (this.isConsistent(staffer, shift.index, assignment)) {
        if (!assignment[shift.index]) {
          assignment[shift.index] = [];
        }
        assignment[shift.index].push(staffer);
        this.assignedShifts[staffer.name] = shift.index;

        if (this.forwardCheck(shift.index, domains, staffer)) {
          this.backtrack(assignment, domains);
        }

        assignment[shift.index].pop();
        delete this.assignedShifts[staffer.name];
        domains = JSON.parse(JSON.stringify(domainCopy));
      }
    }

    return null;
  }

  allShiftsHaveMinStaffers(assignment) {
    return this.shifts.every(
      (shift) => assignment[shift.index] && assignment[shift.index].length >= 1
    );
  }

  allStaffersAssigned(assignment) {
    let assignedStaffers = new Set();

    for (let shiftIndex in assignment) {
      for (let staffer of assignment[shiftIndex]) {
        assignedStaffers.add(staffer.name);
      }
    }

    return this.staffers.every((staffer) => assignedStaffers.has(staffer.name));
  }

  orderDomainValues(shiftIndex, assignment) {
    let stafferConflicts = {};

    for (let staffer of this.domains[shiftIndex]) {
      let conflictCount = 0;

      for (let otherShift of this.shifts) {
        if (
          otherShift.index !== shiftIndex &&
          this.domains[otherShift.index].includes(staffer)
        ) {
          conflictCount++;
        }
      }

      stafferConflicts[staffer.name] = conflictCount;
    }

    return this.domains[shiftIndex].sort(
      (a, b) => stafferConflicts[a.name] - stafferConflicts[b.name]
    );
  }

  calculateScore(assignment) {
    let totalScore = 0;

    for (let shiftIndex in assignment) {
      let assignedStaffers = assignment[shiftIndex];
      let isDoubleShift = assignedStaffers.length === 2;

      for (let staffer of assignedStaffers) {
        let shift = this.shifts.find((shift) => shift.index == shiftIndex);
        let preferenceScore = staffer.getPreferenceScore(shift);
        totalScore += preferenceScore;

        if (staffer.wantsDoubleShift() && isDoubleShift) {
          totalScore += 10;
          // console.log(
          //   `Staffer ${staffer.name} prefers double shift and is assigned to one. +10 bonus.`
          // );
        } else if (staffer.wantsSoloShift() && !isDoubleShift) {
          totalScore += 0;
        } else if (staffer.isIndifferent()) {
          totalScore += 0;
        }
      }
    }

    return totalScore;
  }

  forwardCheck(shiftIndex, domains, staffer) {
    let conflictThreshold = 2;
    let conflicts = 0;

    for (let otherShiftIndex in domains) {
      if (otherShiftIndex != shiftIndex) {
        if (domains[otherShiftIndex].length <= 3) {
          // Only prune when the domain is small
          let newDomain = domains[otherShiftIndex].filter(
            (s) => s.name !== staffer.name
          );

          if (newDomain.length === 0) {
            return false;
          }

          if (newDomain.length < domains[otherShiftIndex].length) {
            conflicts++;
          }

          if (conflicts > conflictThreshold) {
            return false;
          }

          domains[otherShiftIndex] = newDomain;
        }
      }
    }

    return true;
  }

  // selectUnassignedShift(assignment) {
  //   let unassignedShifts = this.shifts.filter(
  //     (shift) =>
  //       (this.phase === 1 &&
  //         (!assignment[shift.index] || assignment[shift.index].length < 1)) ||
  //       (this.phase === 2 && assignment[shift.index].length < 2)
  //   );
  //   let selectedShift = unassignedShifts.reduce((a, b) =>
  //     this.domains[a.index].length < this.domains[b.index].length ? a : b
  //   );
  //   return selectedShift;
  // }
  selectUnassignedShift(assignment) {
    // Filter unassigned shifts based on the current phase
    let unassignedShifts = this.shifts.filter((shift) => {
      if (this.phase === 1) {
        return !assignment[shift.index] || assignment[shift.index].length < 1;
      } else if (this.phase === 2) {
        return assignment[shift.index] && assignment[shift.index].length < 2;
      }
      return false;
    });

    if (unassignedShifts.length === 0) {
      return null; // No unassigned shifts left
    }

    // Select the shift with the smallest domain size
    let selectedShift = unassignedShifts.reduce((a, b) =>
      this.domains[a.index].length < this.domains[b.index].length ? a : b
    );

    return selectedShift;
  }

  isConsistent(staffer, shiftIndex, assignment) {
    if (this.assignedShifts[staffer.name]) {
      return false;
    }
    if (
      this.phase === 1 &&
      assignment[shiftIndex] &&
      assignment[shiftIndex].length >= 1
    ) {
      return false;
    }
    if (
      this.phase === 2 &&
      assignment[shiftIndex] &&
      assignment[shiftIndex].length >= 2
    ) {
      return false;
    }
    return true;
  }
}
