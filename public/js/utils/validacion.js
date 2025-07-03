export function validarCampos(campos) {
    let tieneError = false;

    campos.forEach(({ id, mensaje, span }) => {
        const input = document.getElementById(id);
        const spanMensaje = document.getElementById(span);
        if (!input || !spanMensaje) return;

        spanMensaje.textContent = '';
        input.classList.remove('resaltado-error');

        const esSelect = input.tagName === 'SELECT';
        const valor = input.value.trim();

        if (valor === '' || (esSelect && valor === '')) {
            spanMensaje.textContent = mensaje;
            input.classList.add('resaltado-error');
            tieneError = true;
        }
    });

    return !tieneError; // ✅ Devuelve true si está todo correcto
}