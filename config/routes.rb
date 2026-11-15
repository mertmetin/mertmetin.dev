Rails.application.routes.draw do
  root "pages#home"
  resources :projects, only: :show, param: :slug
  resources :posts, path: "writing", only: %i[index show], param: :slug

  get "sitemap.xml" => "pages#sitemap", as: :sitemap, defaults: { format: :xml }

  # Health check for the load balancer / Kamal.
  get "up" => "rails/health#show", as: :rails_health_check
end
