/* The general structure is to put the AI code in xyz.js and the visualization
   code in c_xyz.js. Create a diagram object that contains all the information
   needed to draw the diagram, including references to the environment&agents.
   Then use a draw function to update the visualization to match the data in
   the environment & agent objects. Use a separate function if possible for 
   controlling the visualization (whether through interaction or animation). 
   Chapter 2 has minimal AI and is mostly animations. */

const SIZE = 100;
const colors = {
    perceptBackground: 'hsl(240,10%,85%)',
    perceptHighlight: 'hsl(60,100%,90%)',
    actionBackground: 'hsl(0,0%,100%)',
    actionHighlight: 'hsl(150,50%,80%)'
};


/* Create a diagram object that includes the world (model) and the svg
   elements (view) */
function makeDiagram(selector) {
    let diagram = {}, world = new World(4);
    diagram.world = world;
    diagram.xPosition = (floorNumber) => 150 + (floorNumber * 600 / diagram.world.floors.length);
    diagram.yPosition = (floorNumber) => 225 + (200 * (floorNumber%2))
    diagram.root = d3.select(selector);
    diagram.robot = diagram.root.append('g')
        .attr('class', 'robot')
        .style('transform', 'translate(150px,115px)');
    diagram.robot.append('rect')
        .attr('width', SIZE)
        .attr('height', SIZE)
        .attr('fill', 'hsl(120,25%,50%)');
    diagram.perceptText = diagram.robot.append('text')
        .attr('x', SIZE/2)
        .attr('y', -25)
        .attr('text-anchor', 'middle');
    diagram.actionText = diagram.robot.append('text')
        .attr('x', SIZE/2)
        .attr('y', -10)
        .attr('text-anchor', 'middle');

    diagram.floors = [];
    for (let floorNumber = 0; floorNumber < world.floors.length; floorNumber++) {
        diagram.floors[floorNumber] =
            diagram.root.append('rect')
            .attr('class', 'clean floor') // for css
            .attr('x', diagram.xPosition(floorNumber) - 150 * (floorNumber%2))
            .attr('y', diagram.yPosition(floorNumber))
            .attr('width', SIZE)
            .attr('height', SIZE/4)
            .attr('stroke', 'black')
            .on('click', function() {
                world.markFloorDirty(floorNumber);
                diagram.floors[floorNumber].attr('class', 'dirty floor');
            });
    }
    return diagram;
}


/* Rendering functions read from the state of the world (diagram.world) 
   and write to the state of the diagram (diagram.*). For most diagrams
   we only need one render function. For the vacuum cleaner example, to
   support the different styles (reader driven, agent driven) and the
   animation (agent perceives world, then pauses, then agent acts) I've
   broken up the render function into several. */

function renderWorld(diagram) {
    for (let floorNumber = 0; floorNumber < diagram.world.floors.length; floorNumber++) {
        diagram.floors[floorNumber].attr('class', diagram.world.floors[floorNumber].dirty? 'dirty floor' : 'clean floor');
    }
    let compensacao = 150 * (diagram.world.location%2)
    diagram.robot.style('transform', `translate(${diagram.xPosition(diagram.world.location)-compensacao}px,${diagram.yPosition(diagram.world.location) -110}px)`);
}

function renderAgentPercept(diagram, dirty) {
    let perceptLabel = {false: "It's clean", true: "It's dirty"}[dirty];
    diagram.perceptText.text(perceptLabel);
}

function renderAgentAction(diagram, action) {
    let actionLabel = {
        null: 'Waiting', 
        'SUCK': 'Vacuuming', 
        'LEFT-UP': 'Going left up', 
        'RIGHT-UP': 'Going right up',
        'LEFT-DOWN': 'Going left down',
        'RIGHT-DOWN': 'Going right down'
    }[action];
    diagram.actionText.text(actionLabel);
}


/* Control the diagram by letting the AI agent choose the action. This
   controller is simple. Every STEP_TIME_MS milliseconds choose an
   action, simulate the action in the world, and draw the action on
   the page. */

const STEP_TIME_MS = 2500;
function makeAgentControlledDiagram() {
    let diagram = makeDiagram('#agent-controlled-diagram svg');


    function update() {
        let location = diagram.world.location;
        let percept = diagram.world.floors[location].dirty;
        let action = reflexVacuumAgent(diagram.world);
        diagram.world.simulate(action);
        renderWorld(diagram);
        renderAgentPercept(diagram, percept);
        renderAgentAction(diagram, action);
    }
    update();
    setInterval(update, STEP_TIME_MS);
}


/* Random Agent com 4 pisos*/

function makeRandomAgentControlledDiagram() {
    let diagram = makeDiagram('#random-agent-controlled-diagram svg');
    const actions = ['LEFT-UP', 'LEFT-DOWN', 'RIGHT-UP', 'RIGHT-DOWN']

    function gerar_numero(anterior){
        let atual = Math.floor(Math.random() * 10)%4
        if(atual != anterior) return atual;
        return gerar_numero(atual)
    }
    function update() {
        let location = diagram.world.location;
        let percept = diagram.world.floors[location].dirty;
        renderAgentPercept(diagram, percept);
        let random = gerar_numero(location)
        let action = percept ? 'SUCK' : actions[random];
        console.log('Piso ' + actions[location])
        console.log('Estado ' + (percept ? 'SUJO' : 'LIMPO'))
        console.log('Ação ' + action)
        diagram.world.simulate(action);
        renderWorld(diagram);
        renderAgentAction(diagram, action);        
    }

    function update_dirty(){
        diagram.world.markFloorDirty(gerar_numero(diagram.world.location))
    }

    update();    

    setInterval(update, STEP_TIME_MS);
    setInterval(update_dirty, STEP_TIME_MS + 2500);
}

/* Control the diagram by letting the reader choose the action. This
   diagram is tricky.
 
   1. If there's an animation already playing and the reader chooses
      an action then *wait* for the animation to finish playing. While
      waiting the reader may choose a different action. Replace the
      previously chosen action with the new one. (An alternative
      design would be to queue up all the actions.)
   2. If there's not an animation already playing then when the reader
      chooses an action then run it right away, without waiting.
   3. Show the connection between the percept and the resulting action
      by highlighting the percepts in the accompanying table, pausing,
      and then highlighting the action.
*/
function makeReaderControlledDiagram() {
    let diagram = makeDiagram('#reader-controlled-diagram svg');
    let nextAction = 'LEFT-UP';
    let animating = false; // either false or a setTimeout intervalID

    function makeButton(action, label, x, y) {
        let button = d3.select('.buttons')
            .append('button')
            .attr('class', 'btn btn-info')
            .style('position', 'absolute')
            .style('left', x + 'px')
            .style('top', y + 'px')
            .style('width', '100px')
            .style('height', '50px')
            .text(label)
            .on('click', () => {
                setAction(action);
                updateButtons();
            });
        button.action = action;
        return button;
    }

    let buttons = [
        makeButton('LEFT-UP', 'Esquerda acima', 50, 200),
        makeButton('RIGHT-UP', 'Direita acima', 300, 200),
        makeButton('LEFT-DOWN', 'Esquerda abaixo', 50, 300),
        makeButton('RIGHT-DOWN', 'Direita abaixo', 300, 300),
        makeButton('SUCK', 'Vacuum', 175, 225)
        .style('height', '100px')
        .attr('class', 'btn-vacuum')               
    ];

    function updateButtons() {
        for (let button of buttons) {
            button.classed('btn btn-warning', button.action == nextAction);
        }
    }

    function setAction(action) {
        nextAction = action;
        if (!animating) { update(); }
    }
    
    function update() {
        let percept = diagram.world.floors[diagram.world.location].dirty;
        if (nextAction !== null) {
            diagram.world.simulate(nextAction);
            renderWorld(diagram);
            renderAgentPercept(diagram, percept);
            renderAgentAction(diagram, nextAction);
            nextAction = null;
            updateButtons();
            animating = setTimeout(update, STEP_TIME_MS);
        } else {
            animating = false;
            renderWorld(diagram);
            renderAgentPercept(diagram, percept);
            renderAgentAction(diagram, null);
        }
    }
}


/* Control the diagram by letting the reader choose the rules that
   the AI agent should follow. The animation flow is similar to the
   first agent controlled diagram but there is an additional table
   UI that lets the reader view the percepts and actions being followed
   as well as change the rules followed by the agent. */
function makeTableControlledDiagram() {
    let diagram = makeDiagram('#table-controlled-diagram svg');

    function update() {
        let table = getRulesFromPage();
        let location = diagram.world.location;
        let percept = diagram.world.floors[location].dirty;
        let action = tableVacuumAgent(diagram.world, table);
        diagram.world.simulate(action);
        renderWorld(diagram);
        renderAgentPercept(diagram, percept);
        renderAgentAction(diagram, action);
        showPerceptAndAction(location, percept, action);
    }
    update();
    setInterval(update, STEP_TIME_MS);
    
    function getRulesFromPage() {
        let table = d3.select("#table-controlled-diagram table");
        let left_up_clean = table.select("[data-action=left-up-clean] select").node().value;
        let left_up_dirty = table.select("[data-action=left-up-dirty] select").node().value;
        let left_down_clean = table.select("[data-action=left-down-clean] select").node().value;
        let left_down_dirty = table.select("[data-action=left-down-dirty] select").node().value;
        let right_up_clean = table.select("[data-action=right-up-clean] select").node().value;
        let right_up_dirty = table.select("[data-action=right-up-dirty] select").node().value;
        let right_down_clean = table.select("[data-action=right-down-clean] select").node().value;
        let right_down_dirty = table.select("[data-action=right-down-dirty] select").node().value;

        return [
            [left_up_clean, left_up_dirty],
            [left_down_clean, left_down_dirty],
            [right_up_clean, right_up_dirty],
            [right_down_clean, right_down_dirty]
        ];
    }

    function showPerceptAndAction(location, percept, action) {
        let locationMarker = location? 'right' : 'left';
        let perceptMarker = percept? 'dirty' : 'clean';
        
        d3.selectAll('#table-controlled-diagram th')
            .filter(function() {
                let marker = d3.select(this).attr('data-input');
                return marker == perceptMarker || marker == locationMarker;
            })
            .style('background-color', (d) => colors.perceptHighlight);
        
        d3.selectAll('#table-controlled-diagram td')
            .style('padding', '5px')
            .filter(function() {
                let marker = d3.select(this).attr('data-action');
                return marker == locationMarker + '-' + perceptMarker;
            })
            .transition().duration(0.05 * STEP_TIME_MS)
            .style('background-color', colors.actionHighlight)
            .transition().duration(0.9 * STEP_TIME_MS)
            .style('background-color', colors.actionBackground);
    }
}


makeAgentControlledDiagram();
makeReaderControlledDiagram();
makeTableControlledDiagram();
makeRandomAgentControlledDiagram();