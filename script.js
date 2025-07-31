// script.js
// Calculator state
let currentInput = '0';
let expression = '';
let memory = 0;
let isRadians = true;
let isPerspectiveView = true;
let isDarkMode = true;

// DOM elements
const expressionEl = document.getElementById('expression');
const resultEl = document.getElementById('result');
const buttonsGrid = document.getElementById('buttons-grid');
const themeToggle = document.getElementById('theme-toggle');
const viewToggle = document.getElementById('view-toggle');

// Button labels
const buttonLabels = [
    'MC', 'MR', 'M+', 'M-', '⌫',
    '√', 'x²', 'xʸ', '1/x', 'C',
    'sin', 'cos', 'tan', '(', ')',
    'π', 'e', 'log', 'ln', '/',
    '7', '8', '9', '*', '%',
    '4', '5', '6', '-', 'deg',
    '1', '2', '3', '+', 'rad',
    '0', '.', '±', '=', 'AC'
];

// Create button labels in the grid
buttonLabels.forEach(label => {
    const buttonDiv = document.createElement('div');
    buttonDiv.className = 'button-label';
    buttonDiv.textContent = label;
    buttonsGrid.appendChild(buttonDiv);
});

// Initialize Three.js
let scene, camera, renderer;
let calculatorBody, display, buttonGroup, buttons = [];
let raycaster, mouse;
let isMouseDown = false;
let pressedButton = null;
let pointLight, directionalLight1, directionalLight2;

function initThreeJS() {
    scene = new THREE.Scene();
    
    // Camera setup
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 15);
    camera.lookAt(0, 0, 0);
    
    // Renderer
    renderer = new THREE.WebGLRenderer({
        canvas: document.getElementById('calculator-canvas'),
        antialias: true,
        alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    
    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight1.position.set(1, 1, 1);
    directionalLight1.castShadow = true;
    scene.add(directionalLight1);
    
    directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight2.position.set(-1, -1, -1);
    scene.add(directionalLight2);
    
    pointLight = new THREE.PointLight(0x00aaff, 1, 100);
    pointLight.position.set(0, 2, 5);
    pointLight.castShadow = true;
    scene.add(pointLight);
    
    // Create calculator body
    const bodyGeometry = new THREE.BoxGeometry(8, 1.5, 12);
    const bodyMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x0a1a2a,
        metalness: 0.7,
        roughness: 0.3,
        clearcoat: 0.8,
        clearcoatRoughness: 0.1,
        transmission: 0.2,
        opacity: 0.9,
        transparent: true,
        side: THREE.DoubleSide,
        envMapIntensity: 1
    });
    
    calculatorBody = new THREE.Mesh(bodyGeometry, bodyMaterial);
    calculatorBody.position.y = -0.5;
    calculatorBody.castShadow = true;
    calculatorBody.receiveShadow = true;
    scene.add(calculatorBody);
    
    // Create display area
    const displayGeometry = new THREE.BoxGeometry(7, 0.8, 0.1);
    const displayMaterial = new THREE.MeshBasicMaterial({
        color: 0x001020,
        transparent: true,
        opacity: 0.7
    });
    
    display = new THREE.Mesh(displayGeometry, displayMaterial);
    display.position.set(0, 0.5, 5.95);
    scene.add(display);
    
    // Create buttons
    buttonGroup = new THREE.Group();
    scene.add(buttonGroup);
    
    const buttonGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.2, 32);
    const buttonMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x102030,
        metalness: 0.8,
        roughness: 0.2,
        clearcoat: 0.9,
        clearcoatRoughness: 0.1,
        transmission: 0.1,
        opacity: 0.95,
        transparent: true
    });
    
    const specialButtonMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x303080,
        metalness: 0.85,
        roughness: 0.15,
        clearcoat: 0.95,
        clearcoatRoughness: 0.07,
        transmission: 0.15,
        opacity: 0.9,
        transparent: true
    });
    
    // Position buttons in a grid
    const rows = 7;
    const cols = 5;
    const startX = -3.2;
    const startY = 0.25;
    const startZ = 4;
    const spacingX = 1.6;
    const spacingZ = 1.2;
    
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const index = row * cols + col;
            const button = new THREE.Mesh(buttonGeometry, buttonMaterial);
            
            // Position buttons
            button.position.x = startX + col * spacingX;
            button.position.y = startY;
            button.position.z = startZ - row * spacingZ;
            
            // Rotate cylinder to stand upright
            button.rotation.x = Math.PI / 2;
            button.castShadow = true;
            button.receiveShadow = true;
            
            // Special styling for certain buttons
            const label = buttonLabels[index];
            if (['=', 'AC', 'C', '⌫', 'M+', 'M-', 'MR', 'MC'].includes(label)) {
                button.material = specialButtonMaterial.clone();
            }
            
            button.userData = {
                label: label,
                originalY: button.position.y,
                pressed: false
            };
            
            buttons.push(button);
            buttonGroup.add(button);
        }
    }
    
    // Raycaster for button interaction
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize);
    
    // Add event listeners
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointerleave', onPointerUp);
    
    // Theme toggle
    themeToggle.addEventListener('click', toggleTheme);
    viewToggle.addEventListener('click', toggleView);
    
    // Initialize
    updateDisplay();
    animate();
}

// Handle mouse/touch events
function onPointerMove(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(buttonGroup.children);
    
    if (intersects.length > 0) {
        const button = intersects[0].object;
        
        if (isMouseDown && !button.userData.pressed) {
            button.userData.pressed = true;
            pressedButton = button;
            
            // Animate button press
            animateButtonPress(button, button.userData.originalY - 0.15, 0.1);
            button.material.color.setHex(0x406090);
            handleButtonPress(button.userData.label);
        }
    }
}

function onPointerDown(event) {
    isMouseDown = true;
    onPointerMove(event);
}

function onPointerUp() {
    isMouseDown = false;
    
    if (pressedButton) {
        // Animate button release
        animateButtonPress(pressedButton, pressedButton.userData.originalY, 0.2);
        
        // Change material back to original
        if (['=', 'AC', 'C', '⌫', 'M+', 'M-', 'MR', 'MC'].includes(pressedButton.userData.label)) {
            pressedButton.material.color.setHex(0x303080);
        } else {
            pressedButton.material.color.setHex(0x102030);
        }
        
        pressedButton.userData.pressed = false;
        pressedButton = null;
    }
}

// Handle button presses
function handleButtonPress(label) {
    switch (label) {
        case 'AC':
            currentInput = '0';
            expression = '';
            break;
            
        case 'C':
            currentInput = '0';
            break;
            
        case '⌫':
            if (currentInput.length === 1) {
                currentInput = '0';
            } else {
                currentInput = currentInput.slice(0, -1);
            }
            break;
            
        case '=':
            try {
                // Format expression for math.js
                let expr = expression + currentInput;
                expr = expr.replace(/π/g, 'pi');
                expr = expr.replace(/e/g, 'e');
                expr = expr.replace(/√/g, 'sqrt');
                expr = expr.replace(/x²/g, '^2');
                expr = expr.replace(/xʸ/g, '^');
                expr = expr.replace(/1\/x/g, '^(-1)');
                
                // Handle trig functions based on mode
                if (isRadians) {
                    expr = expr.replace(/sin/g, 'sin');
                    expr = expr.replace(/cos/g, 'cos');
                    expr = expr.replace(/tan/g, 'tan');
                } else {
                    expr = expr.replace(/sin/g, 'sin(unit(deg))');
                    expr = expr.replace(/cos/g, 'cos(unit(deg))');
                    expr = expr.replace(/tan/g, 'tan(unit(deg))');
                }
                
                // Evaluate expression
                const result = math.evaluate(expr);
                expression = result.toString();
                currentInput = result.toString();
            } catch (error) {
                currentInput = 'Error';
            }
            break;
            
        case '±':
            if (currentInput.startsWith('-')) {
                currentInput = currentInput.slice(1);
            } else {
                currentInput = '-' + currentInput;
            }
            break;
            
        case 'M+':
            memory += parseFloat(currentInput) || 0;
            break;
            
        case 'M-':
            memory -= parseFloat(currentInput) || 0;
            break;
            
        case 'MR':
            currentInput = memory.toString();
            break;
            
        case 'MC':
            memory = 0;
            break;
            
        case 'deg':
        case 'rad':
            isRadians = (label === 'rad');
            break;
            
        case 'π':
            currentInput = 'π';
            break;
            
        case 'e':
            currentInput = 'e';
            break;
            
        case '√':
            currentInput = `√(${currentInput})`;
            break;
            
        case 'log':
            currentInput = `log(${currentInput})`;
            break;
            
        case 'ln':
            currentInput = `ln(${currentInput})`;
            break;
            
        case 'x²':
            currentInput = `(${currentInput})^2`;
            break;
            
        case 'xʸ':
            expression = expression + currentInput + '^';
            currentInput = '0';
            break;
            
        case '1/x':
            currentInput = `1/(${currentInput})`;
            break;
            
        default:
            if ('0123456789.'.includes(label)) {
                if (currentInput === '0' || currentInput === 'Error') {
                    currentInput = label;
                } else {
                    // Only allow one decimal point
                    if (label === '.' && currentInput.includes('.')) {
                        return;
                    }
                    currentInput += label;
                }
            } else {
                // Operation button
                expression = expression + currentInput + label;
                currentInput = '0';
            }
    }
    
    updateDisplay();
}

// Update calculator display
function updateDisplay() {
    resultEl.textContent = currentInput;
    expressionEl.textContent = expression;
}

// Handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Animation loop
let time = 0;

function animate() {
    requestAnimationFrame(animate);
    
    // Animate the calculator
    time += 0.01;
    
    if (isPerspectiveView) {
        calculatorBody.rotation.y = Math.sin(time * 0.5) * 0.05;
        buttonGroup.rotation.y = Math.sin(time * 0.5) * 0.03;
    }
    
    // Animate lights
    pointLight.position.x = Math.sin(time) * 3;
    pointLight.position.z = Math.cos(time) * 3;
    
    renderer.render(scene, camera);
}

// Button animation
function animateButtonPress(button, targetY, duration) {
    const startY = button.position.y;
    const deltaY = targetY - startY;
    const startTime = Date.now();
    
    const animateStep = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / (duration * 1000), 1);
        
        // Cubic easing function
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        
        button.position.y = startY + deltaY * easedProgress;
        
        if (progress < 1) {
            requestAnimationFrame(animateStep);
        }
    };
    
    animateStep();
}

// Toggle theme
function toggleTheme() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('light-mode', !isDarkMode);
    themeToggle.textContent = isDarkMode ? 'Light Mode' : 'Dark Mode';
}

// Toggle view
function toggleView() {
    isPerspectiveView = !isPerspectiveView;
    viewToggle.textContent = isPerspectiveView ? 'Orthographic View' : 'Perspective View';
    
    if (isPerspectiveView) {
        // Switch to perspective camera
        camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 5, 15);
        camera.lookAt(0, 0, 0);
    } else {
        // Switch to orthographic camera
        const aspect = window.innerWidth / window.innerHeight;
        const height = 10;
        const width = height * aspect;
        camera = new THREE.OrthographicCamera(
            width / -2, width / 2, height / 2, height / -2, 1, 100
        );
        camera.position.set(0, 0, 15);
        camera.lookAt(0, 0, 0);
    }
    
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
}

// Initialize
initThreeJS();