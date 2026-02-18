function copyToClipboard(elementId, button) {
    const element = document.getElementById(elementId);
    const textToCopy = element.textContent.trim();
    
    navigator.clipboard.writeText(textToCopy).then(() => {
        const originalIcon = button.innerHTML;
        button.innerHTML = '<i class="fas fa-check"></i>';
        button.classList.add('copied');
        
        setTimeout(() => {
            button.innerHTML = originalIcon;
            button.classList.remove('copied');
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy: ', err);
    });
}