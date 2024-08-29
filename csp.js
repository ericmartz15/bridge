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
  }

  assignDomains() {
    let domains = {};
    for (let shift of this.shifts) {
      domains[shift.index] = this.staffers.filter((staffer) => {
        let score = staffer.getPreferenceScore(shift);
        return score > 0; // Exclude NOOO
      });
    }
    return domains;
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
    // console.log(`Current domains:`, JSON.stringify(domains));

    if (Object.keys(assignment).length === this.shifts.length) {
      let score = this.calculateScore(assignment);
      console.log(`Complete assignment found. Score: ${score}`);
      if (score > this.bestScore) {
        console.log(`New best score found: ${score}`);
        this.bestScore = score;
        this.bestSolution = { ...assignment };
      }
      console.log(
        `Returning current best solution:`,
        JSON.stringify(this.bestSolution)
      );
      return this.bestSolution; // Return the best solution found
    }

    let shift = this.selectUnassignedShift(assignment);
    console.log(`Selected unassigned shift:`, shift ? shift.index : "None");

    if (!shift) {
      console.log(`No unassigned shifts remaining, returning null.`);
      return null;
    }

    let domainCopy = JSON.parse(JSON.stringify(domains)); // Make a deep copy of domains
    // console.log(`Domain copy created for backtracking.`);

    for (let staffer of this.orderDomainValues(shift.index, assignment)) {
      console.log(
        `Trying to assign staffer ${staffer.name} to shift ${shift.index}`
      );

      if (this.isConsistent(staffer, shift.index, assignment)) {
        console
          .log
          //   `Staffer ${staffer.name} is consistent with shift ${shift.index}`
          ();
        if (!assignment[shift.index]) {
          assignment[shift.index] = [];
        }
        assignment[shift.index].push(staffer);
        this.assignedShifts[staffer.name] = shift.index;
        // console.log(`Assigned staffer ${staffer.name} to shift ${shift.index}`);
        // console.log(`Current assignment:`, JSON.stringify(assignment));

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
        console
          .log
          //   `Backtracked: Removed staffer ${staffer.name} from shift ${shift.index}`
          ();
        // console.log(`Restored assignment:`, JSON.stringify(assignment));
        domains = domainCopy; // Restore domains if backtracking
        // console.log(
        //   `Restored domains after backtracking:`,
        //   JSON.stringify(domains)
        // );
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
        // console.log(
        //   `Updated domain for shift ${otherShiftIndex} after forward check:`,
        //   JSON.stringify(domains[otherShiftIndex])
        // );
      }
    }
    console.log(
      `Forward check passed for staffer ${staffer.name} on shift ${shiftIndex}`
    );
    return true; // Forward check passed
  }

  selectUnassignedShift(assignment) {
    // console.log(`Selecting unassigned shift using MRV heuristic.`);
    let unassignedShifts = this.shifts.filter(
      (shift) => !assignment[shift.index] || assignment[shift.index].length < 2
    );
    let selectedShift = unassignedShifts.reduce((a, b) =>
      this.domains[a.index].length < this.domains[b.index].length ? a : b
    );
    // console.log(
    //   `Selected shift:`,
    //   selectedShift ? selectedShift.index : "None"
    // );
    return selectedShift;
  }

  orderDomainValues(variable, assignment) {
    // console.log(
    //   `Ordering domain values for variable ${variable} using LCV heuristic.`
    // );
    let orderedValues = this.domains[variable].sort(
      (a, b) =>
        this.conflictCount(a, assignment) - this.conflictCount(b, assignment)
    );
    // console.log(
    //   `Ordered domain values for shift ${variable}:`,
    //   orderedValues.map((s) => s.name)
    // );
    return orderedValues;
  }

  conflictCount(staffer, assignment) {
    let conflicts = 0;
    for (let shiftIndex in assignment) {
      if (assignment[shiftIndex].includes(staffer)) conflicts++;
    }
    // console.log(`Conflict count for staffer ${staffer.name}: ${conflicts}`);
    return conflicts;
  }

  isConsistent(staffer, shiftIndex, assignment) {
    // console.log(
    //   `Checking consistency for staffer ${staffer.name} on shift ${shiftIndex}`
    // );
    if (this.assignedShifts[staffer.name]) {
      console.log(`Staffer ${staffer.name} already assigned to another shift.`);
      return false;
    }
    if (assignment[shiftIndex] && assignment[shiftIndex].length >= 2) {
      console.log(`Shift ${shiftIndex} already has 2 staffers assigned.`);
      return false;
    }
    console.log(
      `Staffer ${staffer.name} is consistent with shift ${shiftIndex}`
    );
    return true;
  }
}
