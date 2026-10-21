
CREATE TABLE IF NOT EXISTS public.asignaciones_zoom_modulos (
    id BIGSERIAL PRIMARY KEY,

    id_modulo BIGINT NOT NULL UNIQUE,

    id_cuenta_zoom BIGINT NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_asignaciones_zoom_cuenta
        FOREIGN KEY (id_cuenta_zoom)
        REFERENCES public.cuentas_zoom(id)
        ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_asignaciones_zoom_cuenta
    ON public.asignaciones_zoom_modulos(id_cuenta_zoom);
