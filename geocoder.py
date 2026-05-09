import time
import json
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut

geolocator = Nominatim(user_agent="tcc_votorantim_app")

unidades_saude = [
    {"nome": "UBS Vila Nova", "endereco": "Av. Pedro Augusto Rangel, 1925, Vila Nova"},
    {"nome": "UBS Vila Garcia", "endereco": "Av. Izabel Ferreira Coelho, 271, Vila Garcia"},
    {"nome": "UBS Rio Acima", "endereco": "Av. Octávio Augusto Rangel, 1282, Jardim Toledo"},
    {"nome": "UBS Barra Funda", "endereco": "Rua Lopes Chaves, S/N, Barra Funda"},
    {"nome": "UBS Bela Vista", "endereco": "Av. São João, 867, Centro"},
    {"nome": "Hospital Municipal", "endereco": "Rua João Walter, 181, Centro"},
    {"nome": "UPA Central", "endereco": "Rua Antônio Walter, 66-146, Centro"},
    {"nome": "UBS Serrano", "endereco": "Rua Francisco Lopes de Almeida, 76, Jardim Palmira"},
    {"nome": "UBS Clarice", "endereco": "Rua Mercedes Nardi Arcuri, S/N, Jardim Clarice"},
    {"nome": "UBS Itapeva", "endereco": "Rua João Santiago Figueira, 200, Jardim Itapeva"},
    {"nome": "UBS Novo Mundo", "endereco": "Rua Abílio Maia, 46, Jardim Novo Mundo"},
    {"nome": "UBS Archila", "endereco": "Rua Lázara Bueno de Arruda, Jardim Archila"},
    {"nome": "ESF Promorar", "endereco": "Rua Boaventura Maganhato, 138, São Matheus"},
    {"nome": "ESF Cristal", "endereco": "Rua Anália Pereira, 762, Jardim Cristal"},
    {"nome": "ESF Tatiana", "endereco": "Rua Adriano Maciel de Queiroz, 569, Jardim Tatiana"},
    {"nome": "ESF São João", "endereco": "Rua Zilda Tescaro Sbrana, Parque São João"},
    {"nome": "ESF Green Valley", "endereco": "Rua José Raimundo da Silva, Green Valley"},
    {"nome": "ESF Amorim", "endereco": "Rua José Antônio de Mello, 81, Vila Amorim"}
]

# Manual overrides for coordinates when Nominatim fails
manual_coords = {
    "UBS Vila Garcia": (-23.5512, -47.4320), # Proxy near Vila Nova
    "UBS Bela Vista": (-23.5350, -47.4420),
    "Hospital Municipal": (-23.5380, -47.4450),
    "UPA Central": (-23.5375, -47.4460),
    "UBS Clarice": (-23.5532, -47.4411),
    "UBS Itapeva": (-23.5655, -47.4380),
    "UBS Novo Mundo": (-23.5583, -47.4645),
    "UBS Archila": (-23.5415, -47.4522),
    "ESF Promorar": (-23.5460, -47.4410),
    "ESF Cristal": (-23.5695, -47.4360),
    "ESF São João": (-23.5500, -47.4200),
    "ESF Green Valley": (-23.5750, -47.4900),
    "ESF Amorim": (-23.5430, -47.4480)
}

def get_coordinates(address):
    try:
        full_address = f"{address}, Votorantim, SP, Brasil"
        location = geolocator.geocode(full_address, timeout=10)
        if location:
            return location.latitude, location.longitude
        return None, None
    except GeocoderTimedOut:
        return get_coordinates(address)

print("--- Iniciando conversão de endereços ---")
dados_finais = []

for unidade in unidades_saude:
    lat, lon = get_coordinates(unidade["endereco"])
    if lat:
        unidade["lat"] = lat
        unidade["lng"] = lon
        dados_finais.append(unidade)
        print(f"[OK] {unidade['nome']} localizado.")
    else:
        print(f"[AVISO] {unidade['nome']} não localizado no Nominatim. Usando coordenadas fallback.")
        if unidade["nome"] in manual_coords:
            unidade["lat"] = manual_coords[unidade["nome"]][0]
            unidade["lng"] = manual_coords[unidade["nome"]][1]
            dados_finais.append(unidade)
        else:
            print(f"[ERRO] Sem fallback para: {unidade['nome']}")
    time.sleep(1.5)

with open('dados_votorantim.json', 'w', encoding='utf-8') as f:
    json.dump(dados_finais, f, ensure_ascii=False, indent=4)

print("\nArquivo 'dados_votorantim.json' gerado com sucesso!")