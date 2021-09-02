// In this simple problem the world includes both the environment and the robot
// but in most problems the environment and world would be separate
class World {
    constructor(numFloors) {
        this.location = 0;
        this.floors = [];
        for (let i = 0; i < numFloors; i++) {
            this.floors.push({ dirty: false, nivel: 0 });
        }
    }

    markFloorDirty(floorNumber) {
        this.floors[floorNumber].dirty = true;
        this.floors[floorNumber].nivel = 1 + (Math.floor(Math.random() * 10)%3);      
    }

    simulate(action) {
        switch (action) {
            case 'SUCK':
                this.floors[this.location].dirty = false;
                break;
            case 'LEFT-UP':
                this.location = 0;
                break;
            case 'RIGHT-UP':
                this.location = 2;
                break;
            case 'LEFT-DOWN':
                this.location = 1;
                break;
            case 'RIGHT-DOWN':
                this.location = 3;
                break;
            case 'ESVAZIAR':
                this.location = 4;
                break;
        }

        return action;
    }
}


// Rules are defined in code
function reflexVacuumAgent(world) {
    if (world.floors[world.location].dirty) {
        return 'SUCK';
    }
    else if (world.location == 0) {
        return 'RIGHT-UP';
    }
    else if (world.location == 2) {
        return 'RIGHT-DOWN';
    }
    else if (world.location == 1) {
        return 'LEFT-UP';
    }
    else if (world.location == 3) {
        return 'LEFT-DOWN';
    }
}

// Rules are defined in data, in a table indexed by [location][dirty]
function tableVacuumAgent(world, table) {
    let location = world.location;
    let dirty = world.floors[location].dirty ? 1 : 0;
    return table[location][dirty];
}
