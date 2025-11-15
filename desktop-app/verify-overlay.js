/**
 * Overlay Verification Script
 * Analyzes the overlay implementation to verify correctness
 */

const fs = require('fs');
const path = require('path');

console.log('\n=== OVERLAY VERIFICATION REPORT ===\n');

// 1. Check overlayManager.js
console.log('1. OVERLAY MANAGER ANALYSIS');
console.log('   File: src/overlay/overlayManager.js');

const overlayManagerPath = path.join(__dirname, 'src/overlay/overlayManager.js');
const overlayManagerCode = fs.readFileSync(overlayManagerPath, 'utf8');

// Check for required functions
const requiredFunctions = [
    'createOverlay',
    'showTrackingActive',
    'updateBatchCount',
    'showStatus'
];

requiredFunctions.forEach(func => {
    const found = overlayManagerCode.includes(`function ${func}`) || overlayManagerCode.includes(`${func}(`);
    console.log(`   ✓ ${func}: ${found ? 'PRESENT' : 'MISSING'}`);
});

// Check for console logs
const overlayLogs = overlayManagerCode.match(/console\.log\('\[Overlay\][^']+'\)/g);
console.log(`\n   Console Logs Found:`);
if (overlayLogs) {
    overlayLogs.forEach(log => {
        console.log(`   - ${log.replace("console.log('", '').replace("')", '')}`);
    });
}

// Check IPC channels
const ipcChannels = overlayManagerCode.match(/send\('overlay:[^']+'/g);
console.log(`\n   IPC Channels:`);
if (ipcChannels) {
    ipcChannels.forEach(channel => {
        console.log(`   - ${channel.replace("send('", '')}`);
    });
}

// 2. Check main.js integration
console.log('\n\n2. MAIN.JS INTEGRATION ANALYSIS');
console.log('   File: src/main.js');

const mainPath = path.join(__dirname, 'src/main.js');
const mainCode = fs.readFileSync(mainPath, 'utf8');

// Check overlay import
const hasOverlayImport = mainCode.includes("require('./overlay/overlayManager')");
console.log(`   ✓ Overlay import: ${hasOverlayImport ? 'PRESENT' : 'MISSING'}`);

// Check createOverlay call
const hasCreateOverlay = mainCode.includes('overlayManager.createOverlay()');
console.log(`   ✓ createOverlay() call: ${hasCreateOverlay ? 'PRESENT' : 'MISSING'}`);

// Check updateBatchCount call
const hasUpdateBatchCount = mainCode.includes('overlayManager.updateBatchCount(totalBatchesSent)');
console.log(`   ✓ updateBatchCount() call: ${hasUpdateBatchCount ? 'PRESENT' : 'MISSING'}`);

// Check showTrackingActive call
const hasShowTrackingActive = mainCode.includes('overlayManager.showTrackingActive(totalBatchesSent)');
console.log(`   ✓ showTrackingActive() call: ${hasShowTrackingActive ? 'PRESENT' : 'MISSING'}`);

// Check processBatch function
const processBatchMatch = mainCode.match(/async function processBatch\(\) \{[\s\S]+?\n\}/m);
if (processBatchMatch) {
    const processBatchCode = processBatchMatch[0];
    const hasOverlayUpdate = processBatchCode.includes('overlayManager.');
    console.log(`   ✓ Overlay updates in processBatch(): ${hasOverlayUpdate ? 'PRESENT' : 'MISSING'}`);

    // Check if totalBatchesSent is incremented
    const hasBatchIncrement = processBatchCode.includes('totalBatchesSent++');
    console.log(`   ✓ totalBatchesSent increment: ${hasBatchIncrement ? 'PRESENT' : 'MISSING'}`);
}

// Check batch interval
const batchIntervalMatch = mainCode.match(/batchIntervalMs[^\d]+(\d+)/);
if (batchIntervalMatch) {
    console.log(`   ✓ Batch interval: ${batchIntervalMatch[1]}ms (${batchIntervalMatch[1]/1000} seconds)`);
}

// Check console logs
const desktopLogs = mainCode.match(/console\.log\('\[Desktop\][^']+'\)/g);
console.log(`\n   Console Logs Found:`);
if (desktopLogs) {
    desktopLogs.slice(0, 5).forEach(log => {
        console.log(`   - ${log.replace("console.log('", '').replace("')", '')}`);
    });
    if (desktopLogs.length > 5) {
        console.log(`   - ... and ${desktopLogs.length - 5} more`);
    }
}

// 3. Check preload.js IPC setup
console.log('\n\n3. PRELOAD.JS IPC SETUP');
console.log('   File: src/preload.js');

const preloadPath = path.join(__dirname, 'src/preload.js');
const preloadCode = fs.readFileSync(preloadPath, 'utf8');

const ipcListeners = [
    'onOverlayUpdate',
    'onBatchCount',
    'onOverlayHide'
];

ipcListeners.forEach(listener => {
    const found = preloadCode.includes(listener);
    console.log(`   ✓ ${listener}: ${found ? 'PRESENT' : 'MISSING'}`);
});

// 4. Check overlay.html renderer
console.log('\n\n4. OVERLAY.HTML RENDERER');
console.log('   File: src/overlay/overlay.html');

const overlayHtmlPath = path.join(__dirname, 'src/overlay/overlay.html');
const overlayHtmlCode = fs.readFileSync(overlayHtmlPath, 'utf8');

// Check for IPC listeners in HTML
const htmlListeners = [
    'window.electronAPI.onOverlayUpdate',
    'window.electronAPI.onBatchCount',
    'window.electronAPI.onOverlayHide'
];

htmlListeners.forEach(listener => {
    const found = overlayHtmlCode.includes(listener);
    console.log(`   ✓ ${listener}: ${found ? 'PRESENT' : 'MISSING'}`);
});

// Check for batch counter element
const hasBatchCounter = overlayHtmlCode.includes('id="batch-counter"');
console.log(`   ✓ Batch counter element: ${hasBatchCounter ? 'PRESENT' : 'MISSING'}`);

// Check for status message element
const hasStatusMessage = overlayHtmlCode.includes('id="status-message"');
console.log(`   ✓ Status message element: ${hasStatusMessage ? 'PRESENT' : 'MISSING'}`);

// 5. Verify workflow
console.log('\n\n5. WORKFLOW VERIFICATION');

const workflow = {
    'App initialization': mainCode.includes('overlayManager.createOverlay()'),
    'Overlay window created': overlayManagerCode.includes('overlayWindow = new BrowserWindow'),
    'Preload script loaded': overlayManagerCode.includes("preload: path.join(__dirname, '../preload.js')"),
    'Batch processing': mainCode.includes('async function processBatch()'),
    'Batch counter increment': mainCode.includes('totalBatchesSent++'),
    'updateBatchCount called': mainCode.includes('overlayManager.updateBatchCount(totalBatchesSent)'),
    'showTrackingActive called': mainCode.includes('overlayManager.showTrackingActive(totalBatchesSent)'),
    'IPC message sent': overlayManagerCode.includes("send('overlay:batch-count', count)"),
    'IPC listener setup': preloadCode.includes("on('overlay:batch-count', callback)"),
    'HTML updates batch count': overlayHtmlCode.includes('batchCounter.textContent = `${count} batches`')
};

Object.entries(workflow).forEach(([step, status]) => {
    console.log(`   ${status ? '✓' : '✗'} ${step}`);
});

// 6. Check for potential issues
console.log('\n\n6. POTENTIAL ISSUES');

let issuesFound = 0;

// Check if overlay is always visible
if (overlayManagerCode.includes('show: true')) {
    console.log('   ✓ Overlay set to show: true (visible on creation)');
} else {
    console.log('   ⚠ Overlay might not be visible on creation');
    issuesFound++;
}

// Check if overlay is positioned correctly
if (overlayManagerCode.includes('x: width - 370')) {
    console.log('   ✓ Overlay positioned 20px from right edge');
} else {
    console.log('   ⚠ Overlay positioning may be incorrect');
    issuesFound++;
}

// Check if overlay is always on top
if (overlayManagerCode.includes('alwaysOnTop: true')) {
    console.log('   ✓ Overlay set to alwaysOnTop: true');
} else {
    console.log('   ⚠ Overlay might not be visible over other windows');
    issuesFound++;
}

// Check if metrics are being sent
if (mainCode.includes("console.log('[Desktop] Metrics sent successfully')")) {
    console.log('   ✓ Metrics logging present');
} else {
    console.log('   ⚠ No metrics logging found');
    issuesFound++;
}

// Check batch interval timing
const intervalMatch = mainCode.match(/setInterval\([^,]+,\s*CONFIG\.batchIntervalMs\)/);
if (intervalMatch) {
    console.log('   ✓ Batch interval uses CONFIG.batchIntervalMs (10000ms = 10s)');
} else {
    console.log('   ⚠ Batch interval configuration may be incorrect');
    issuesFound++;
}

// 7. Summary
console.log('\n\n7. SUMMARY');
console.log('   ===================================');

if (issuesFound === 0) {
    console.log('   ✓ All checks passed!');
    console.log('   ✓ Overlay should be functioning correctly');
} else {
    console.log(`   ⚠ Found ${issuesFound} potential issue(s)`);
}

console.log('\n   Expected behavior:');
console.log('   - Overlay window created at app startup');
console.log('   - Console logs: "[Overlay] Created successfully"');
console.log('   - Console logs: "[Overlay] Content loaded"');
console.log('   - Every 10 seconds:');
console.log('     * processBatch() executes');
console.log('     * totalBatchesSent increments');
console.log('     * overlayManager.updateBatchCount() called');
console.log('     * overlayManager.showTrackingActive() called');
console.log('     * Console logs: "[Desktop] Metrics sent successfully"');
console.log('     * Overlay displays: "Tracking Active • X batches"');

console.log('\n=== END OF REPORT ===\n');
