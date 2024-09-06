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
  }

  assignDomains() {
    let domains = {};
    for (let shift of this.shifts) {
      domains[shift.index] = this.staffers.filter((staffer) => {
        let score = staffer.getPreferenceScore(shift);
        return score > 0; // Exclude NOOO
      });
    }
    const domainNames = this.getDomainNames(domains);
    console.log(`Initial domains:`, JSON.stringify(domainNames));
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
    this.solution = this.backtrack(assignment, this.domains);
    return this.solution;
  }

  backtrack(assignment, domains) {
    this.backtrackCallCount++; // Increment counter

    console.log(`\n--- Backtrack call #${this.backtrackCallCount} ---`);
    console.log(`Current assignment:`, JSON.stringify(assignment));

    // If every shift has 1 or 2 staffers assigned, we're done
    if (
      Object.keys(assignment).length === this.shifts.length &&
      this.allShiftsHaveMinStaffers(assignment) &&
      this.allStaffersAssigned(assignment)
    ) {
      let score = this.calculateScore(assignment);
      console.log(`Complete assignment found. Score: ${score}`);
      if (score > this.bestScore) {
        console.log(`New best score found: ${score}`);
        this.bestScore = score;
        this.bestSolution = { ...assignment };
      }
      return this.bestSolution; // Return the best solution found
    }

    // Check if all shifts have at least one staffer assigned in Phase 1
    if (this.phase === 1 && this.allShiftsHaveMinStaffers(assignment)) {
      console.log("Phase 1 complete. Moving to Phase 2.");
      this.phase = 2; // Move to Phase 2
    }

    let shift = this.selectUnassignedShift(assignment);
    console.log(`Selected unassigned shift:`, shift ? shift.index : "None");

    if (!shift) {
      console.log(`No unassigned shifts remaining, returning null.`);
      return null;
    }

    let domainCopy = JSON.parse(JSON.stringify(domains)); // Make a deep copy of domains
    console.log(
      `Domain copy created for backtracking:`,
      JSON.stringify(this.getDomainNames(domainCopy))
    );

    for (let staffer of this.orderDomainValues(shift.index, assignment)) {
      console.log(
        `Trying to assign staffer ${staffer.name} to shift ${shift.index}`
      );

      if (this.isConsistent(staffer, shift.index, assignment)) {
        console.log(
          `Staffer ${staffer.name} is consistent with shift ${shift.index}`
        );
        if (!assignment[shift.index]) {
          assignment[shift.index] = [];
        }
        assignment[shift.index].push(staffer);
        this.assignedShifts[staffer.name] = shift.index;
        console.log(`Assigned staffer ${staffer.name} to shift ${shift.index}`);
        console.log(`Current assignment:`, JSON.stringify(assignment));

        // Perform forward checking
        if (this.forwardCheck(shift.index, domains, staffer)) {
          console.log(
            `Forward check passed for staffer ${staffer.name} on shift ${shift.index}`
          );
          let result = this.backtrack(assignment, domains);
          if (result) return result;
        } else {
          console.log(
            `Forward check failed for staffer ${staffer.name} on shift ${shift.index}`
          );
        }

        assignment[shift.index].pop();
        delete this.assignedShifts[staffer.name];
        console.log(
          `Backtracked: Removed staffer ${staffer.name} from shift ${shift.index}`
        );
        console.log(`Restored assignment:`, JSON.stringify(assignment));
        domains = JSON.parse(JSON.stringify(domainCopy)); // Restore domains after backtracking
        console.log(
          `Restored domains after backtracking:`,
          JSON.stringify(this.getDomainNames(domains))
        );
      } else {
        console.log(
          `Staffer ${staffer.name} is not consistent with shift ${shift.index}, skipping.`
        );
      }
    }

    console.log(
      `No valid assignment found for shift ${shift.index}, returning null.`
    );
    return null;
  }

  allShiftsHaveMinStaffers(assignment) {
    return this.shifts.every(
      (shift) => assignment[shift.index] && assignment[shift.index].length >= 1
    );
  }
  allStaffersAssigned(assignment) {
    let assignedStaffers = new Set();

    // Gather all staffers from the assignment
    for (let shiftIndex in assignment) {
      for (let staffer of assignment[shiftIndex]) {
        assignedStaffers.add(staffer.name); // Add unique staffer names
      }
    }

    // Check if all staffers are assigned
    return this.staffers.every((staffer) => assignedStaffers.has(staffer.name));
  }

  orderDomainValues(shiftIndex, assignment) {
    console.log(
      `Ordering domain values for shift ${shiftIndex} using Least Constraining Value (LCV) heuristic.`
    );

    let stafferConflicts = {};

    // For each staffer in the domain of the current shift, count how many other shifts they are a valid option for.
    for (let staffer of this.domains[shiftIndex]) {
      let conflictCount = 0;

      // Go through other shifts and count how many are impacted by this staffer's assignment
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

    // Sort staffers by those who impose the fewest constraints on remaining shifts
    let orderedStaffers = this.domains[shiftIndex].sort(
      (a, b) => stafferConflicts[a.name] - stafferConflicts[b.name]
    );

    console.log(
      `Ordered domain values for shift ${shiftIndex}:`,
      orderedStaffers.map((staffer) => staffer.name)
    );

    return orderedStaffers;
  }
  calculateScore(assignment) {
    let totalScore = 0;

    // Iterate over each shift in the assignment
    for (let shiftIndex in assignment) {
      let assignedStaffers = assignment[shiftIndex];

      // Calculate the score based on each staffer's preference for this shift
      for (let staffer of assignedStaffers) {
        let shift = this.shifts.find((shift) => shift.index == shiftIndex);
        let preferenceScore = staffer.getPreferenceScore(shift);
        totalScore += preferenceScore;

        console.log(
          `Shift ${shiftIndex}: Staffer ${staffer.name} assigned with preference score ${preferenceScore}`
        );
      }
    }

    console.log(`Total score for current assignment: ${totalScore}`);
    return totalScore;
  }

  forwardCheck(shiftIndex, domains, staffer) {
    console.log(
      `Performing forward check for staffer ${staffer.name} on shift ${shiftIndex}`
    );
    for (let otherShiftIndex in domains) {
      if (otherShiftIndex != shiftIndex) {
        let newDomain = domains[otherShiftIndex].filter(
          (s) => s.name !== staffer.name
        );
        if (newDomain.length === 0) {
          console.log(
            `Forward check failed: no valid domains left for shift ${otherShiftIndex} after removing ${staffer.name}`
          );
          return false; // No valid assignments left, backtrack
        }
        domains[otherShiftIndex] = newDomain;
        console.log(
          `Updated domain for shift ${otherShiftIndex} after forward check:`,
          JSON.stringify(domains[otherShiftIndex].map((s) => s.name))
        );
      }
    }
    return true; // Forward check passed
  }

  selectUnassignedShift(assignment) {
    console.log(`Selecting unassigned shift using MRV heuristic.`);
    let unassignedShifts = this.shifts.filter(
      (shift) =>
        (this.phase === 1 &&
          (!assignment[shift.index] || assignment[shift.index].length < 1)) ||
        (this.phase === 2 && assignment[shift.index].length < 2)
    );
    let selectedShift = unassignedShifts.reduce((a, b) =>
      this.domains[a.index].length < this.domains[b.index].length ? a : b
    );
    return selectedShift;
  }

  isConsistent(staffer, shiftIndex, assignment) {
    console.log(
      `Checking consistency for staffer ${staffer.name} on shift ${shiftIndex}`
    );
    if (this.assignedShifts[staffer.name]) {
      console.log(`Staffer ${staffer.name} already assigned to another shift.`);
      return false;
    }
    if (
      this.phase === 1 &&
      assignment[shiftIndex] &&
      assignment[shiftIndex].length >= 1
    ) {
      console.log(`Shift ${shiftIndex} already has one staffer in Phase 1.`);
      return false;
    }
    if (
      this.phase === 2 &&
      assignment[shiftIndex] &&
      assignment[shiftIndex].length >= 2
    ) {
      console.log(`Shift ${shiftIndex} already has 2 staffers in Phase 2.`);
      return false;
    }
    return true;
  }
}
