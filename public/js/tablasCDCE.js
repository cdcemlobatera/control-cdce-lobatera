export function crearTablaConFiltros({ idTabla, columnas, datos, filtros }) {
    console.log('Títulos definidos:', columnas.map(c => c.title));
    const tabla = $(`#${idTabla}`).DataTable({
        data: datos,
        pageLength: 5,
        scrollX: true,
        columns: columnas.map(c => ({
            data: c.key ?? c.data,
            title: c.title ?? '',
            visible: c.visible !== false,
            orderable: c.orderable ?? true,
            searchable: c.searchable ?? true,
            defaultContent: c.defaultContent ?? '',
            render: c.render
        }))
    });

    filtros.forEach(({ idSelect, columnaIndex }) => {
        const select = document.getElementById(idSelect);
        if (!select) return;

        select.addEventListener('change', function () {
            tabla.column(columnaIndex).search(this.value).draw();
        });
    });
}