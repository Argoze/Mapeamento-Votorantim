import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapPin } from 'lucide-react';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const CARTO_API_KEY = import.meta.env.VITE_CARTO_API_KEY;
const TILE_URL = CARTO_API_KEY
    ? `https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=${CARTO_API_KEY}`
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = CARTO_API_KEY
    ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attribution/">CARTO</a>'
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const CENTRO_VOTORANTIM = [-23.5451, -47.4451];

function MarcadorClicavel({ position, onMudarPosicao }) {
    useMapEvents({
        click(e) {
            onMudarPosicao(e.latlng.lat, e.latlng.lng);
        },
    });

    return position ? (
        <Marker
            position={position}
            draggable
            eventHandlers={{
                dragend: (e) => {
                    const { lat, lng } = e.target.getLatLng();
                    onMudarPosicao(lat, lng);
                },
            }}
        />
    ) : null;
}

function RecentralizarEmMudancaExterna({ lat, lng, recenterToken }) {
    const map = useMap();
    useEffect(() => {
        if (recenterToken && lat != null && !Number.isNaN(lat) && lng != null && !Number.isNaN(lng)) {
            map.flyTo([lat, lng], Math.max(map.getZoom(), 16), { duration: 0.6 });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [recenterToken]);
    return null;
}

export default function LocationMapPicker({ lat, lng, onChange, recenterToken }) {
    const temCoordenada = lat !== '' && lat != null && !Number.isNaN(Number(lat))
        && lng !== '' && lng != null && !Number.isNaN(Number(lng));
    const position = temCoordenada ? [Number(lat), Number(lng)] : null;
    const center = position || CENTRO_VOTORANTIM;

    return (
        <div>
            <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm" style={{ height: 260 }}>
                <MapContainer
                    center={center}
                    zoom={position ? 16 : 13}
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom
                >
                    <TileLayer attribution={TILE_ATTRIBUTION} url={TILE_URL} />
                    <MarcadorClicavel
                        position={position}
                        onMudarPosicao={(novaLat, novaLng) => onChange(novaLat, novaLng)}
                    />
                    <RecentralizarEmMudancaExterna lat={Number(lat)} lng={Number(lng)} recenterToken={recenterToken} />
                </MapContainer>
            </div>
            <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1.5">
                <MapPin size={12} className="flex-shrink-0" />
                {position
                    ? 'Clique em outro ponto do mapa ou arraste o marcador pra ajustar a localização exata.'
                    : 'Clique no mapa pra marcar a localização (ou use "Buscar Coordenadas" pelo endereço acima).'}
            </p>
        </div>
    );
}